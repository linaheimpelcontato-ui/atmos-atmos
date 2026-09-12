import { expect, it } from "vitest";
import * as XLSX from "xlsx";
import { importProductsFromExcel } from "./excelUtils";

it("imports a real XLSX workbook with accents, cents, zero cost and supplier identity", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
    ID: "local-product", Nome: "Experiência São João", Tipo: "experience",
    "Valor Venda": 100.05, "Preço de Custo": 0, Status: "Ativo", "Fornecedor ID": "local-supplier",
  }]), "Produtos");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const result = await importProductsFromExcel(new File([bytes], "local-fixture.xlsx"));
  expect(result[0]).toMatchObject({ id: "local-product", name: "Experiência São João",
    unit_price: 100.05, cost_price: 0, is_active: true, supplier_id: "local-supplier" });
});
