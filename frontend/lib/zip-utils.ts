import JSZip from "jszip"

export interface ExtractedFile {
  path: string
  name: string
  size: number
  content: string | null
  selected: boolean
  isDirectory: boolean
}

export async function extractZipFile(zipFile: File): Promise<ExtractedFile[]> {
  const zip = new JSZip()
  const zipContent = await zip.loadAsync(zipFile)
  const extractedFiles: ExtractedFile[] = []

  for (const [path, zipEntry] of Object.entries(zipContent.files)) {
    // Skip directories and hidden files
    if (zipEntry.dir || path.startsWith("__MACOSX") || path.includes("/.")) {
      continue
    }

    // Only extract text-based files (logs, code files)
    const isTextFile =
      path.endsWith(".log") ||
      path.endsWith(".txt") ||
      path.endsWith(".js") ||
      path.endsWith(".ts") ||
      path.endsWith(".jsx") ||
      path.endsWith(".tsx") ||
      path.endsWith(".py") ||
      path.endsWith(".java") ||
      path.endsWith(".cpp") ||
      path.endsWith(".c") ||
      path.endsWith(".cs") ||
      path.endsWith(".rb") ||
      path.endsWith(".go") ||
      path.endsWith(".php") ||
      path.endsWith(".swift") ||
      path.endsWith(".kt") ||
      path.endsWith(".rs")

    if (isTextFile) {
      try {
        const content = await zipEntry.async("text")
        extractedFiles.push({
          path,
          name: path.split("/").pop() || path,
          size: content.length,
          content,
          selected: true, // Selected by default
          isDirectory: false,
        })
      } catch (error) {
        console.error(`Failed to extract ${path}:`, error)
      }
    }
  }

  return extractedFiles.sort((a, b) => a.path.localeCompare(b.path))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}