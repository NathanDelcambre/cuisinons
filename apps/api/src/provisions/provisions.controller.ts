import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { QUANTITY_UNITS, RETAILERS, STORAGE_AREAS } from '@cuisinons/shared';
import { InternalJwtGuard } from '../auth/internal-jwt.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/internal-jwt.guard.js';
import { parseIsoDate } from '../planner/dates.js';
import { ProvisionsService } from './provisions.service.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const quantity = z.number().positive().max(100_000);

const productSelection = {
  retailer: z.enum(RETAILERS),
  economical: z.boolean().default(true),
};

const generateSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('week'), from: isoDate, ...productSelection }),
  z.object({
    mode: z.literal('days'),
    dates: z.array(isoDate).min(1).max(31),
    ...productSelection,
  }),
  z.object({
    mode: z.literal('next'),
    days: z.number().int().min(1).max(31),
    from: isoDate.optional(),
    ...productSelection,
  }),
]);

@Controller()
@UseGuards(InternalJwtGuard)
export class ProvisionsController {
  constructor(@Inject(ProvisionsService) private readonly provisions: ProvisionsService) {}

  // ---------------------------------------------------------------- Stock

  @Get('/pantry')
  pantry(@CurrentUser() user: AuthUser) {
    return this.provisions.listPantry(user.id);
  }

  @Get('/provisions/summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.provisions.summary(user.id);
  }

  @Post('/pantry/items')
  addPantry(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z
      .object({
        ingredientId: z.string().min(1),
        quantity,
        unit: z.enum(QUANTITY_UNITS),
        area: z.enum(STORAGE_AREAS).optional(),
      })
      .parse(body);
    return this.provisions.addPantryItem(user.id, parsed);
  }

  @Patch('/pantry/items/:id')
  updatePantry(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        // Zero est accepte : c'est ainsi qu'on vide une ligne depuis l'interface.
        quantity: z.number().nonnegative().max(100_000).optional(),
        area: z.enum(STORAGE_AREAS).optional(),
      })
      .parse(body);
    return this.provisions.updatePantryItem(user.id, id, parsed);
  }

  @Delete('/pantry/items/:id')
  removePantry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.provisions.removePantryItem(user.id, id);
  }

  // -------------------------------------------------------------- Courses

  @Get('/shopping/list')
  list(@CurrentUser() user: AuthUser) {
    return this.provisions.activeList(user.id);
  }

  @Get('/shopping/retailer-estimates')
  retailerEstimates(@CurrentUser() user: AuthUser) {
    return this.provisions.retailerEstimates(user.id);
  }

  @Patch('/shopping/retailer')
  retailer(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z.object({ retailer: z.enum(RETAILERS), economical: z.boolean() }).parse(body);
    return this.provisions.changeRetailer(user.id, parsed);
  }

  @Post('/shopping/generate')
  generate(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = generateSchema.parse(body);
    if (parsed.mode === 'week') {
      return this.provisions.generate(user.id, {
        mode: 'week',
        from: parseIsoDate(parsed.from),
        retailer: parsed.retailer,
        economical: parsed.economical,
      });
    }
    if (parsed.mode === 'days') {
      return this.provisions.generate(user.id, {
        mode: 'days',
        dates: parsed.dates.map(parseIsoDate),
        retailer: parsed.retailer,
        economical: parsed.economical,
      });
    }
    return this.provisions.generate(user.id, {
      mode: 'next',
      days: parsed.days,
      from: parsed.from ? parseIsoDate(parsed.from) : todayUtc(),
      retailer: parsed.retailer,
      economical: parsed.economical,
    });
  }

  @Post('/shopping/items')
  addItem(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z
      .object({ ingredientId: z.string().min(1), quantity, unit: z.enum(QUANTITY_UNITS) })
      .parse(body);
    return this.provisions.addShoppingItem(user.id, parsed);
  }

  @Patch('/shopping/items/:id')
  updateItem(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z
      .object({
        quantity: z.number().nonnegative().max(100_000).optional(),
        checked: z.boolean().optional(),
      })
      .parse(body);
    return this.provisions.updateShoppingItem(user.id, id, parsed);
  }

  @Get('/shopping/items/:id/product-options')
  productOptions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.provisions.shoppingProductOptions(user.id, id);
  }

  @Patch('/shopping/items/:id/product')
  selectProduct(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z.object({ barcode: z.string().min(8).max(14) }).parse(body);
    return this.provisions.selectShoppingProduct(user.id, id, parsed.barcode);
  }

  @Delete('/shopping/items/:id')
  removeItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.provisions.removeShoppingItem(user.id, id);
  }

  @Post('/shopping/validate')
  validate(@CurrentUser() user: AuthUser) {
    return this.provisions.validate(user.id);
  }

  // --------------------------------------------------------- Consommation

  @Post('/provisions/consumption')
  consumption(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = z.object({ portionId: z.string().min(1), consumed: z.boolean() }).parse(body);
    return this.provisions.setConsumption(user.id, parsed.portionId, parsed.consumed);
  }
}

/** Minuit UTC du jour courant, comme les dates du planning. */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
