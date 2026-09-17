import ExcelJS from "exceljs";
import path from "node:path";
function cellString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text;
  if (typeof value === "object" && "richText" in value) return value.richText.map((p) => p.text ?? "").join("");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value);
}
async function main() {
  const file = path.resolve(process.cwd(), "../../.data/ciqual-2025.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  console.log("sheets", wb.worksheets.map((s) => s.name + " rows=" + s.rowCount).join(" | "));
  const sheet = wb.worksheets.find((s) => /ciqual|alim|compo/i.test(s.name)) ?? wb.worksheets[0];
  const headerRow = sheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > 20) return;
    const raw = cell.value;
    const normalized = cellString(raw).replace(/\s+/g, " ").trim();
    console.log(col + "\t" + JSON.stringify(normalized).slice(0, 160));
  });
  console.log("--- row 2 ---");
  sheet.getRow(2).eachCell({ includeEmpty: true }, (cell, col) => {
    if (col > 10) return;
    console.log(col + "\t" + JSON.stringify(cellString(cell.value)).slice(0, 180));
  });
}
main();
