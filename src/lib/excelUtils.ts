import * as XLSX from 'xlsx';
import { type Product } from '@/components/admin/products/shared';

/**
 * Exports products to an Excel file (.xlsx)
 */
export function exportProductsToExcel(products: Product[], filename = 'produtos-atmos.xlsx') {
  // Map data to a flat structure for Excel
  const data = products.map(p => ({
    'ID': p.id,
    'Nome': p.name,
    'Tipo': p.type,
    'Categoria': p.category || '',
    'Preço Unitário': p.unit_price,
    'Preço de Custo': p.cost_price || 0,
    'Status': p.is_active ? 'Ativo' : 'Inativo',
    'Descrição': p.description || '',
    'Fornecedor ID': p.supplier_id || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');

  // Generate and download
  XLSX.writeFile(workbook, filename);
}

/**
 * Imports products from an Excel file
 */
export async function importProductsFromExcel(file: File): Promise<Partial<Product>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Map back to Product structure
        const products: Partial<Product>[] = jsonData.map(row => ({
          id: row['ID'] || undefined,
          name: String(row['Nome'] || ''),
          type: String(row['Tipo'] || 'other'),
          category: row['Categoria'] ? String(row['Categoria']) : null,
          unit_price: Number(row['Preço Unitário'] || 0),
          cost_price: Number(row['Preço de Custo'] || 0),
          is_active: String(row['Status']).toLowerCase() === 'ativo',
          description: row['Descrição'] ? String(row['Descrição']) : null,
          supplier_id: row['Fornecedor ID'] ? String(row['Fornecedor ID']) : null,
        }));

        resolve(products);
      } catch (err) {
        reject(new Error('Erro ao processar arquivo Excel. Verifique o formato das colunas.'));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}
