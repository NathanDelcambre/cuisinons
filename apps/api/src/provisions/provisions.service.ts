import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { QuantityUnit, StorageArea } from '@cuisinons/db';
import {
  aggregateQuantities,
  bulkPieceSuggestion,
  canonicalQuantity,
  defaultStorageArea,
  portionRequirement,
  roundForPurchase,
  RETAILERS,
  selectProductOffer,
  type ProductSelection,
  subtractStock,
  type QuantityLine,
  type Retailer,
} from '@cuisinons/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { addDays, startOfWeek } from '../planner/dates.js';
import { OpenFoodFactsService } from './open-food-facts.service.js';

/** Fenetre maximale d'une generation, pour borner la requete et la liste. */
const MAX_WINDOW_DAYS = 31;

/** Ligne que le stock n'a pas pu couvrir, nommee pour l'affichage. */
type MissingLine = QuantityLine & { name: string };

type GenerateInput = (
  | { mode: 'week'; from: Date }
  | { mode: 'days'; dates: Date[] }
  | { mode: 'next'; days: number; from: Date }
) & { retailer: Retailer; economical: boolean };

/** Ce que l'interface affiche d'un ingredient : rien de plus n'est transfere. */
const ingredientSelect = {
  select: { id: true, nameFr: true, iconUrl: true, uxCategory: true },
} as const;

const pantryProductSelect = {
  select: {
    barcode: true,
    name: true,
    brand: true,
    imageUrl: true,
    packageQuantity: true,
    packageUnit: true,
    nutriScore: true,
    isActive: true,
  },
} as const;

const shoppingIngredientSelect = {
  select: {
    id: true,
    nameFr: true,
    iconUrl: true,
    uxCategory: true,
    conversions: {
      where: { unit: 'PIECE' as const },
      select: { gramsPerUnit: true },
      take: 1,
    },
  },
} as const;

@Injectable()
export class ProvisionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OpenFoodFactsService) private readonly products: OpenFoodFactsService,
  ) {}

  // ---------------------------------------------------------------- Stock

  async listPantry(userId: string) {
    const items = await this.prisma.pantryItem.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { ingredient: ingredientSelect, product: pantryProductSelect },
      orderBy: [{ area: 'asc' }, { product: { name: 'asc' } }],
    });
    return items.map((item) => ({
      id: item.id,
      area: item.area,
      quantity: Number(item.quantity),
      unit: item.unit,
      updatedAt: item.updatedAt,
      ingredient: item.ingredient,
      product: {
        ...item.product,
        packageQuantity:
          item.product.packageQuantity === null ? null : Number(item.product.packageQuantity),
      },
    }));
  }

  async searchPantryProducts(query: string) {
    const products = await this.products.searchProducts(query.trim());
    return products.map((product) => ({
      ...product,
      packageQuantity: product.packageQuantity === null ? null : Number(product.packageQuantity),
    }));
  }

  async summary(userId: string) {
    const [areas, active] = await Promise.all([
      this.prisma.pantryItem.groupBy({
        by: ['area'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.shoppingList.findFirst({
        where: { userId, completedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }),
    ]);
    const counts: Partial<Record<StorageArea, number>> = {};
    for (const row of areas) {
      counts[row.area] = row._count._all;
    }
    const toBuy = active
      ? await this.prisma.shoppingListItem.count({
          where: { listId: active.id, checked: false },
        })
      : 0;
    return { counts, toBuy };
  }

  /** Ajoute au stock : un second exemplaire du même produit s'y cumule. */
  async addPantryItem(
    userId: string,
    input: { productBarcode: string; quantity: number; area?: StorageArea },
  ) {
    const product = await this.products.productByBarcode(input.productBarcode);
    if (!product) throw new NotFoundException('Produit OpenFoodFacts introuvable.');
    if (product.packageUnit !== 'G' && product.packageUnit !== 'ML') {
      throw new BadRequestException('Le format de ce produit ne permet pas de suivre le stock.');
    }
    const ingredient = await this.products.resolveIngredientForProduct(product.name);
    if (!ingredient) {
      throw new BadRequestException('Aucun ingrédient SIQUAL compatible avec ce produit.');
    }
    const area = input.area ?? defaultStorageArea(ingredient.uxCategory);
    return this.prisma.pantryItem.upsert({
      where: {
        userId_productBarcode: {
          userId,
          productBarcode: product.barcode,
        },
      },
      update: { quantity: { increment: input.quantity }, ...(input.area ? { area } : {}) },
      create: {
        userId,
        ingredientId: ingredient.id,
        productBarcode: product.barcode,
        unit: product.packageUnit,
        quantity: input.quantity,
        area,
      },
    });
  }

  /** Corrige une ligne de stock : la quantite remplace l'ancienne. */
  async updatePantryItem(
    userId: string,
    id: string,
    input: { quantity?: number; area?: StorageArea },
  ) {
    await this.assertOwnPantryItem(userId, id);
    if (input.quantity !== undefined && input.quantity <= 0) {
      await this.prisma.pantryItem.delete({ where: { id } });
      return { ok: true, deleted: true };
    }
    return this.prisma.pantryItem.update({
      where: { id },
      data: { quantity: input.quantity, area: input.area },
    });
  }

  async removePantryItem(userId: string, id: string) {
    await this.assertOwnPantryItem(userId, id);
    await this.prisma.pantryItem.delete({ where: { id } });
    return { ok: true };
  }

  private async assertOwnPantryItem(userId: string, id: string) {
    const item = await this.prisma.pantryItem.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!item) throw new NotFoundException('Ligne de stock introuvable.');
    // Le stock est personnel : on ne touche jamais celui de l'autre compte.
    if (item.userId !== userId) throw new ForbiddenException('Ce stock ne t’appartient pas.');
  }

  // -------------------------------------------------------------- Courses

  async activeList(userId: string) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { userId, completedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { ingredient: shoppingIngredientSelect },
          orderBy: [{ ingredient: { uxCategory: 'asc' } }, { ingredient: { nameFr: 'asc' } }],
        },
      },
    });
    if (!list) return null;
    return {
      id: list.id,
      fromDate: list.fromDate,
      toDate: list.toDate,
      createdAt: list.createdAt,
      retailer: list.retailer,
      economical: list.economical,
      items: list.items.map((item) => {
        const { conversions, ...ingredient } = item.ingredient;
        return {
          id: item.id,
          quantity: Number(item.quantity),
          neededQuantity:
            item.neededQuantity === null ? Number(item.quantity) : Number(item.neededQuantity),
          unit: item.unit,
          origin: item.origin,
          checked: item.checked,
          ingredient,
          bulkSuggestion: item.productBarcode
            ? null
            : bulkPieceSuggestion({
                quantity: Number(item.neededQuantity ?? item.quantity),
                unit: item.unit,
                category: item.ingredient.uxCategory,
                gramsPerPiece: conversions[0] ? Number(conversions[0].gramsPerUnit) : null,
              }),
          product:
            item.productBarcode && item.productName
              ? {
                  barcode: item.productBarcode,
                  name: item.productName,
                  brand: item.productBrand,
                  imageUrl: item.productImageUrl,
                  packageQuantity:
                    item.packageQuantity === null ? null : Number(item.packageQuantity),
                  packageCount: item.packageCount,
                  estimatedPrice: item.estimatedPrice === null ? null : Number(item.estimatedPrice),
                  currency: item.currency,
                  priceObservedAt: item.priceObservedAt,
                  storeName: item.storeName,
                  economyNote: item.economyNote,
                  source: item.dataSource,
                }
              : null,
        };
      }),
    };
  }

  /** Compare les six paniers avec une seule recherche catalogue par ingrédient. */
  async retailerEstimates(userId: string) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { userId, completedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { ingredient: { select: { nameFr: true } } } } },
    });
    if (!list) return [];
    const uniqueNames = [...new Set(list.items.map((item) => item.ingredient.nameFr))];
    const offersByName = new Map(
      await Promise.all(
        uniqueNames.map(
          async (name) => [name, await this.products.findOffersForAllRetailers(name)] as const,
        ),
      ),
    );
    return RETAILERS.map((retailer) => {
      let regularCents = 0;
      let economicalCents = 0;
      let regularPricedItems = 0;
      let economicalPricedItems = 0;
      for (const item of list.items) {
        const offers = offersByName.get(item.ingredient.nameFr)!;
        const neededQuantity = Number(item.neededQuantity ?? item.quantity);
        const regular = selectProductOffer({
          neededQuantity,
          neededUnit: item.unit,
          offers: offers[retailer],
          economical: false,
        });
        const economical = selectProductOffer({
          neededQuantity,
          neededUnit: item.unit,
          offers: offers[retailer],
          economical: true,
        });
        if (regular) {
          regularCents += Math.round(regular.totalPrice * 100);
          regularPricedItems += 1;
        }
        if (economical) {
          economicalCents += Math.round(economical.totalPrice * 100);
          economicalPricedItems += 1;
        }
      }
      return {
        retailer,
        regularTotal: regularPricedItems > 0 ? regularCents / 100 : null,
        economicalTotal: economicalPricedItems > 0 ? economicalCents / 100 : null,
        regularPricedItems,
        economicalPricedItems,
        totalItems: list.items.length,
      };
    });
  }

  /** Change les préférences d'achat et re-sélectionne chaque produit. */
  async changeRetailer(userId: string, input: { retailer: Retailer; economical: boolean }) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { userId, completedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { ingredient: { select: { nameFr: true } } } } },
    });
    if (!list) throw new NotFoundException('Aucune liste de courses en cours.');
    const selections = await Promise.all(
      list.items.map(async (item) => {
        const needed = Number(item.neededQuantity ?? item.quantity);
        const offers = await this.products.findOffers(item.ingredient.nameFr, input.retailer);
        return {
          item,
          selection: selectProductOffer({
            neededQuantity: needed,
            neededUnit: item.unit,
            offers,
            economical: input.economical,
          }),
        };
      }),
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.shoppingList.update({
        where: { id: list.id },
        data: { retailer: input.retailer, economical: input.economical },
      });
      for (const { item, selection } of selections) {
        const needed = Number(item.neededQuantity ?? item.quantity);
        await tx.shoppingListItem.update({
          where: { id: item.id },
          data: selection
            ? this.shoppingProductData(selection, needed)
            : {
                quantity: needed,
                neededQuantity: needed,
                dataSource: 'CIQUAL_FALLBACK',
                productBarcode: null,
                productName: null,
                productBrand: null,
                productImageUrl: null,
                packageQuantity: null,
                packageCount: null,
                estimatedPrice: null,
                currency: null,
                priceObservedAt: null,
                storeName: null,
                economyNote: null,
              },
        });
      }
    });
    return this.activeList(userId);
  }

  /**
   * Recalcule les lignes issues du planning pour la periode demandee. Les lignes
   * ajoutees a la main sont conservees : elles ne viennent pas du planning, donc
   * une regeneration ne doit pas les effacer.
   */
  async generate(userId: string, input: GenerateInput) {
    const dates = this.resolveDates(input);
    const needed = await this.requirementsFor(userId, dates);
    const stock = await this.pantryLines(userId);
    const missing = subtractStock(needed, stock).map((line) => ({
      ...line,
      quantity: roundForPurchase(line.quantity, line.unit),
    }));
    const selections = await this.productSelections(missing, input.retailer, input.economical);

    const from = dates[0]!;
    const to = dates[dates.length - 1]!;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.shoppingList.findFirst({
        where: { userId, completedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      const list =
        existing ??
        (await tx.shoppingList.create({
          data: {
            userId,
            fromDate: from,
            toDate: to,
            retailer: input.retailer,
            economical: input.economical,
          },
        }));
      if (existing) {
        await tx.shoppingList.update({
          where: { id: list.id },
          data: {
            fromDate: from,
            toDate: to,
            retailer: input.retailer,
            economical: input.economical,
          },
        });
        await tx.shoppingListItem.deleteMany({ where: { listId: list.id, origin: 'PLANNER' } });
      }
      // Ne restent que les lignes manuelles. Leur quantite a ete decidee a la
      // main : on ne la recalcule pas, sinon le besoin du planning s'ajouterait
      // a chaque generation et l'article grossirait sans raison.
      const manual = await tx.shoppingListItem.findMany({
        where: { listId: list.id },
        select: { ingredientId: true, unit: true },
      });
      const decided = new Set(manual.map((item) => `${item.ingredientId}|${item.unit}`));
      const fresh = missing.filter((line) => !decided.has(`${line.ingredientId}|${line.unit}`));
      if (fresh.length > 0) {
        await tx.shoppingListItem.createMany({
          data: fresh.map((line) => ({
            ...(selections.get(`${line.ingredientId}|${line.unit}`)
              ? this.shoppingProductData(
                  selections.get(`${line.ingredientId}|${line.unit}`)!,
                  line.quantity,
                )
              : {
                  quantity: line.quantity,
                  neededQuantity: line.quantity,
                  dataSource: 'CIQUAL_FALLBACK' as const,
                }),
            listId: list.id,
            ingredientId: line.ingredientId,
            unit: line.unit,
            origin: 'PLANNER' as const,
          })),
        });
      }
    });

    return this.activeList(userId);
  }

  async addShoppingItem(
    userId: string,
    input: { ingredientId: string; quantity: number; unit: QuantityUnit },
  ) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: input.ingredientId },
      select: { id: true, nameFr: true },
    });
    if (!ingredient) throw new NotFoundException('Ingrédient introuvable.');
    const canonical = canonicalQuantity(input.quantity, input.unit);
    const list = await this.ensureList(userId);
    const selection = list.retailer
      ? selectProductOffer({
          neededQuantity: canonical.quantity,
          neededUnit: canonical.unit,
          offers: await this.products.findOffers(ingredient.nameFr, list.retailer),
          economical: list.economical,
        })
      : null;
    await this.prisma.shoppingListItem.upsert({
      where: {
        listId_ingredientId_unit: {
          listId: list.id,
          ingredientId: input.ingredientId,
          unit: canonical.unit,
        },
      },
      update: { quantity: { increment: canonical.quantity }, origin: 'MANUAL' },
      create: {
        ...(selection
          ? this.shoppingProductData(selection, canonical.quantity)
          : {
              quantity: canonical.quantity,
              neededQuantity: canonical.quantity,
              dataSource: 'CIQUAL_FALLBACK' as const,
            }),
        listId: list.id,
        ingredientId: input.ingredientId,
        unit: canonical.unit,
        origin: 'MANUAL',
      },
    });
    return this.activeList(userId);
  }

  async shoppingProductOptions(userId: string, id: string) {
    const { item, selections } = await this.selectableProductsForItem(userId, id);
    const shortlist = selections
      .sort(
        (a, b) =>
          Number(b.barcode === item.productBarcode) - Number(a.barcode === item.productBarcode),
      )
      .slice(0, 12);
    return shortlist.map((selection) => ({
      barcode: selection.barcode,
      name: selection.name,
      brand: selection.brand,
      imageUrl: selection.imageUrl,
      packageQuantity: selection.packageQuantity,
      packageUnit: selection.packageUnit,
      packageCount: selection.packageCount,
      estimatedPrice: selection.totalPrice,
      currency: selection.currency,
      priceObservedAt: selection.observedAt,
      storeName: selection.storeName,
    }));
  }

  async selectShoppingProduct(userId: string, id: string, barcode: string) {
    const { item, selections } = await this.selectableProductsForItem(userId, id);
    const selection = selections.find((candidate) => candidate.barcode === barcode);
    if (!selection) {
      throw new BadRequestException('Ce produit ne correspond pas à cet ingrédient ou ce magasin.');
    }
    const neededQuantity = Number(item.neededQuantity ?? item.quantity);
    await this.prisma.shoppingListItem.update({
      where: { id },
      data: this.shoppingProductData(selection, neededQuantity),
    });
    return this.activeList(userId);
  }

  async updateShoppingItem(userId: string, id: string, input: { checked: boolean }) {
    await this.assertOwnShoppingItem(userId, id);
    await this.prisma.shoppingListItem.update({
      where: { id },
      data: { checked: input.checked },
    });
    return this.activeList(userId);
  }

  async removeShoppingItem(userId: string, id: string) {
    await this.assertOwnShoppingItem(userId, id);
    await this.prisma.shoppingListItem.delete({ where: { id } });
    return this.activeList(userId);
  }

  /**
   * Valide les courses faites : les lignes cochees rejoignent le stock avec la
   * quantite affichee, qui a pu etre corrigee si le magasin n'avait pas le
   * format exact. La liste se clot quand il n'y reste plus rien.
   */
  async validate(userId: string) {
    const list = await this.prisma.shoppingList.findFirst({
      where: { userId, completedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { ingredient: { select: { uxCategory: true } } } } },
    });
    if (!list) throw new NotFoundException('Aucune liste de courses en cours.');
    const bought = list.items.filter((item) => item.checked);
    if (bought.length === 0) {
      throw new BadRequestException('Coche d’abord ce que tu as acheté.');
    }
    const withoutProduct = bought.filter((item) => !item.productBarcode);
    if (withoutProduct.length > 0) {
      throw new BadRequestException(
        'Choisis un produit OpenFoodFacts pour chaque article avant de l’ajouter aux réserves.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of bought) {
        await tx.pantryItem.upsert({
          where: {
            userId_productBarcode: {
              userId,
              productBarcode: item.productBarcode!,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            userId,
            ingredientId: item.ingredientId,
            productBarcode: item.productBarcode!,
            unit: item.unit,
            quantity: item.quantity,
            area: defaultStorageArea(item.ingredient.uxCategory),
          },
        });
      }
      await tx.shoppingListItem.deleteMany({ where: { id: { in: bought.map((i) => i.id) } } });
      const left = await tx.shoppingListItem.count({ where: { listId: list.id } });
      if (left === 0) {
        await tx.shoppingList.update({ where: { id: list.id }, data: { completedAt: new Date() } });
      }
    });

    return { added: bought.length, list: await this.activeList(userId) };
  }

  private async ensureList(userId: string) {
    const existing = await this.prisma.shoppingList.findFirst({
      where: { userId, completedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return existing ?? this.prisma.shoppingList.create({ data: { userId } });
  }

  private async assertOwnShoppingItem(userId: string, id: string) {
    const item = await this.prisma.shoppingListItem.findUnique({
      where: { id },
      select: { list: { select: { userId: true } } },
    });
    if (!item) throw new NotFoundException('Ligne de courses introuvable.');
    if (item.list.userId !== userId)
      throw new ForbiddenException('Cette liste ne t’appartient pas.');
  }

  private async selectableProductsForItem(userId: string, id: string) {
    const item = await this.prisma.shoppingListItem.findUnique({
      where: { id },
      select: {
        quantity: true,
        neededQuantity: true,
        productBarcode: true,
        unit: true,
        ingredient: { select: { nameFr: true } },
        list: { select: { userId: true, retailer: true } },
      },
    });
    if (!item) throw new NotFoundException('Ligne de courses introuvable.');
    if (item.list.userId !== userId) {
      throw new ForbiddenException('Cette liste ne t’appartient pas.');
    }
    if (!item.list.retailer) {
      throw new BadRequestException('Choisis d’abord un magasin en générant la liste.');
    }
    const neededQuantity = Number(item.neededQuantity ?? item.quantity);
    const offers = await this.products.findOffers(item.ingredient.nameFr, item.list.retailer);
    const selections = offers
      .map((offer) =>
        selectProductOffer({
          neededQuantity,
          neededUnit: item.unit,
          offers: [offer],
          economical: false,
        }),
      )
      .filter((selection): selection is ProductSelection => selection !== null);
    return { item, selections };
  }

  // --------------------------------------------------------- Consommation

  /**
   * Marque une portion comme consommee et retire du stock ce qu'elle a demande.
   * `consumedAt` rend l'operation idempotente, et l'annulation recredite les
   * memes quantites.
   */
  async setConsumption(userId: string, portionId: string, consumed: boolean) {
    const portion = await this.prisma.mealParticipantPortion.findUnique({
      where: { id: portionId },
      include: {
        mealItem: {
          include: {
            recipe: {
              select: {
                servings: true,
                ingredients: {
                  select: { ingredientId: true, quantity: true, unit: true, grams: true },
                },
              },
            },
            manualIngredients: {
              select: { ingredientId: true, quantity: true, unit: true, grams: true },
            },
          },
        },
      },
    });
    if (!portion) throw new NotFoundException('Portion introuvable.');
    if (portion.userId !== userId) {
      throw new ForbiddenException('Seul le convive concerné peut valider sa portion.');
    }
    const already = portion.consumedAt !== null;
    if (already === consumed) {
      // Jour passé jamais déduit : le refus de validation doit quand même
      // rester, sinon le prochain chargement rerayerait le créneau.
      if (!consumed && !portion.skipAutoConsume) {
        await this.prisma.mealParticipantPortion.update({
          where: { id: portionId },
          data: { skipAutoConsume: true },
        });
      }
      return { consumed: already, missing: await this.withNames([]) };
    }

    // Restaurant et repas sauté : pas de stock à déduire.
    const recipe = portion.mealItem.recipe;
    const manualIngredients = portion.mealItem.manualIngredients;
    if (!recipe && manualIngredients.length === 0) {
      await this.prisma.mealParticipantPortion.update({
        where: { id: portionId },
        data: { skipAutoConsume: !consumed, consumedAt: null },
      });
      return { consumed: false, missing: await this.withNames([]) };
    }

    const lines = aggregateQuantities(
      (recipe?.ingredients ?? manualIngredients)
        .map((line) =>
          portionRequirement(
            {
              ingredientId: line.ingredientId,
              quantity: Number(line.quantity),
              unit: line.unit,
              grams: line.grams === null ? null : Number(line.grams),
            },
            Number(recipe?.servings ?? 1),
            Number(portion.portions),
          ),
        )
        .filter((line): line is QuantityLine => line !== null),
    );

    const missing: QuantityLine[] = [];
    await this.prisma.$transaction(async (tx) => {
      if (!consumed) {
        const debits = await tx.pantryConsumption.findMany({ where: { portionId } });
        for (const debit of debits) {
          await tx.pantryItem.upsert({
            where: {
              userId_productBarcode: { userId, productBarcode: debit.productBarcode },
            },
            update: { quantity: { increment: debit.quantity } },
            create: {
              userId,
              ingredientId: debit.ingredientId,
              productBarcode: debit.productBarcode,
              unit: debit.unit,
              quantity: debit.quantity,
              area: debit.area,
            },
          });
        }
        await tx.pantryConsumption.deleteMany({ where: { portionId } });
      } else {
        for (const line of lines) {
          const stocks = await tx.pantryItem.findMany({
            where: {
              userId,
              ingredientId: line.ingredientId,
              unit: line.unit,
              quantity: { gt: 0 },
            },
            orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
          });
          const have = stocks.reduce((total, stock) => total + Number(stock.quantity), 0);
          if (have < line.quantity) {
            missing.push({ ...line, quantity: Math.round((line.quantity - have) * 10) / 10 });
          }
          let remaining = line.quantity;
          for (const stock of stocks) {
            if (remaining <= 0) break;
            const debit = Math.min(remaining, Number(stock.quantity));
            if (debit <= 0) continue;
            await tx.pantryItem.update({
              where: { id: stock.id },
              data: { quantity: { decrement: debit } },
            });
            await tx.pantryConsumption.upsert({
              where: {
                portionId_productBarcode: { portionId, productBarcode: stock.productBarcode },
              },
              update: { quantity: { increment: debit } },
              create: {
                portionId,
                productBarcode: stock.productBarcode,
                ingredientId: stock.ingredientId,
                area: stock.area,
                quantity: debit,
                unit: stock.unit,
              },
            });
            remaining -= debit;
          }
        }
      }
      await tx.mealParticipantPortion.update({
        where: { id: portionId },
        data: {
          consumedAt: consumed ? new Date() : null,
          skipAutoConsume: !consumed,
        },
      });
    });

    return { consumed, missing: await this.withNames(missing) };
  }

  /**
   * Un jour passé sans avoir retiré le repas compte comme validé : on déduit
   * le stock une fois, sauf si l'utilisateur a explicitement annulé.
   */
  async settlePastConsumption(userId: string) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const pending = await this.prisma.mealParticipantPortion.findMany({
      where: {
        userId,
        consumedAt: null,
        skipAutoConsume: false,
        mealItem: {
          date: { lt: today },
          OR: [{ recipeId: { not: null } }, { manualIngredients: { some: {} } }],
        },
      },
      select: { id: true },
    });
    const missing: MissingLine[] = [];
    for (const portion of pending) {
      const result = await this.setConsumption(userId, portion.id, true);
      missing.push(...result.missing);
    }
    return { settled: pending.length, missing };
  }

  /** Tous les comptes : destiné au cron, pas à une ouverture de page. */
  async settlePastConsumptionAll() {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    let settled = 0;
    for (const user of users) {
      const result = await this.settlePastConsumption(user.id);
      settled += result.settled;
    }
    return { settled };
  }

  /** L'interface annonce ce qui a manque : un identifiant n'y suffirait pas. */
  private async withNames(lines: QuantityLine[]): Promise<MissingLine[]> {
    if (lines.length === 0) return [];
    const names = await this.prisma.ingredient.findMany({
      where: { id: { in: lines.map((line) => line.ingredientId) } },
      select: { id: true, nameFr: true },
    });
    const byId = new Map(names.map((item) => [item.id, item.nameFr]));
    return lines.map((line) => ({ ...line, name: byId.get(line.ingredientId) ?? 'Ingrédient' }));
  }

  // ------------------------------------------------------------- Interne

  private resolveDates(input: GenerateInput): Date[] {
    if (input.mode === 'week') {
      const start = startOfWeek(input.from);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    if (input.mode === 'next') {
      if (input.days < 1 || input.days > MAX_WINDOW_DAYS) {
        throw new BadRequestException(`Choisis entre 1 et ${String(MAX_WINDOW_DAYS)} jours.`);
      }
      return Array.from({ length: input.days }, (_, i) => addDays(input.from, i));
    }
    if (input.dates.length === 0) throw new BadRequestException('Sélectionne au moins un jour.');
    if (input.dates.length > MAX_WINDOW_DAYS) {
      throw new BadRequestException(`Pas plus de ${String(MAX_WINDOW_DAYS)} jours à la fois.`);
    }
    return [...input.dates].sort((a, b) => a.getTime() - b.getTime());
  }

  /** Besoins cumules de l'utilisateur sur les journees demandees. */
  private async requirementsFor(userId: string, dates: Date[]): Promise<QuantityLine[]> {
    const items = await this.prisma.mealItem.findMany({
      where: {
        date: { in: dates },
        portions: { some: { userId, portions: { gt: 0 } } },
      },
      include: {
        recipe: {
          select: {
            servings: true,
            ingredients: {
              select: { ingredientId: true, quantity: true, unit: true, grams: true },
            },
          },
        },
        manualIngredients: {
          select: { ingredientId: true, quantity: true, unit: true, grams: true },
        },
        portions: { where: { userId }, select: { portions: true, consumedAt: true } },
      },
    });
    const lines: QuantityLine[] = [];
    for (const item of items) {
      const portion = item.portions[0];
      if (!portion) continue;
      // Un repas deja consomme a deja puise dans le stock : le racheter serait
      // compter deux fois.
      if (portion.consumedAt !== null) continue;
      const source = item.recipe?.ingredients ?? item.manualIngredients;
      if (source.length === 0) continue;
      for (const line of source) {
        const need = portionRequirement(
          {
            ingredientId: line.ingredientId,
            quantity: Number(line.quantity),
            unit: line.unit,
            grams: line.grams === null ? null : Number(line.grams),
          },
          Number(item.recipe?.servings ?? 1),
          Number(portion.portions),
        );
        if (need) lines.push(need);
      }
    }
    return aggregateQuantities(lines);
  }

  private async pantryLines(userId: string): Promise<QuantityLine[]> {
    const items = await this.prisma.pantryItem.findMany({
      where: { userId },
      select: { ingredientId: true, quantity: true, unit: true },
    });
    return items.map((item) => ({
      ingredientId: item.ingredientId,
      quantity: Number(item.quantity),
      unit: item.unit,
    }));
  }

  /** Résout chaque besoin générique vers un produit et un prix observé. */
  private async productSelections(
    lines: QuantityLine[],
    retailer: Retailer,
    economical: boolean,
  ): Promise<Map<string, ProductSelection>> {
    const result = new Map<string, ProductSelection>();
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: lines.map((line) => line.ingredientId) } },
      select: { id: true, nameFr: true },
    });
    const names = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.nameFr]));
    await Promise.all(
      lines.map(async (line) => {
        const name = names.get(line.ingredientId);
        if (!name) return;
        const offers = await this.products.findOffers(name, retailer);
        const selected = selectProductOffer({
          neededQuantity: line.quantity,
          neededUnit: line.unit,
          offers,
          economical,
        });
        if (selected) result.set(`${line.ingredientId}|${line.unit}`, selected);
      }),
    );
    return result;
  }

  private shoppingProductData(selection: ProductSelection, neededQuantity: number) {
    return {
      quantity: selection.purchaseQuantity,
      neededQuantity,
      dataSource: 'OPEN_FOOD_FACTS' as const,
      productBarcode: selection.barcode,
      productName: selection.name,
      productBrand: selection.brand,
      productImageUrl: selection.imageUrl,
      packageQuantity: selection.packageQuantity,
      packageCount: selection.packageCount,
      estimatedPrice: selection.totalPrice,
      currency: selection.currency,
      priceObservedAt: new Date(`${selection.observedAt}T00:00:00.000Z`),
      storeName: selection.storeName,
      economyNote: selection.economyNote,
    };
  }
}
