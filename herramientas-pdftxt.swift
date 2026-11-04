// Vuelca el texto de uno o más PDF (PDFKit de macOS; no hay pdftotext). Uso: swiftc -O herramientas-pdftxt.swift -o /tmp/pdftxt
import PDFKit
for p in CommandLine.arguments.dropFirst() {
  guard let d = PDFDocument(url: URL(fileURLWithPath: p)) else { continue }
  print("=====", p)
  for i in 0..<d.pageCount { print("--- página", i + 1); print(d.page(at: i)?.string ?? "") }
}
