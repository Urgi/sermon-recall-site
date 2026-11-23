/** Max PDF upload size (bytes). Sermon manuscripts are text; 15 MB covers image-heavy ones. */
export const PDF_MAX_BYTES = 15 * 1024 * 1024;
export const PDF_MAX_MB = PDF_MAX_BYTES / (1024 * 1024);

/** Same cap generate-devotionals applies before prompting; longer text is cut there anyway. */
export const PDF_MAX_CHARS = 120_000;
