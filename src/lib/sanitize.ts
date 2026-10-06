/**
 * Sanitize OCR-extracted text for TTS (Text-to-Speech) generation.
 *
 * Removes markdown, HTML, code blocks, URLs, base64 data, special symbols,
 * and other artifacts that sound robotic when spoken aloud.
 * Preserves meaningful sentences in a natural, listener-friendly format.
 */
export function cleanForTTS(raw: string): string {
    let text = raw

    // ── 1. Remove base64-encoded data (images, etc.) ──
    text = text.replace(/!\[.*?\]\(data:[^)]+\)/g, '')       // ![alt](data:...)
    text = text.replace(/data:[a-zA-Z/+;=]+,[A-Za-z0-9+/=\s]+/g, '')

    // ── 2. Remove fenced code blocks ──
    text = text.replace(/```[\s\S]*?```/g, ' ')
    text = text.replace(/~~~[\s\S]*?~~~/g, ' ')

    // ── 3. Remove inline code ──
    text = text.replace(/`[^`]+`/g, (match) => {
        // Keep the inner text if it looks like a readable word/phrase
        const inner = match.slice(1, -1).trim()
        return /^[a-zA-Z0-9\s.,'-]+$/.test(inner) ? inner : ' '
    })

    // ── 4. Remove HTML tags ──
    text = text.replace(/<[^>]*>/g, ' ')

    // ── 5. Remove markdown images & links (keep link text) ──
    text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '')           // images
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')        // [text](url) → text

    // ── 6. Remove raw URLs ──
    text = text.replace(/https?:\/\/\S+/g, ' ')
    text = text.replace(/www\.\S+/g, ' ')

    // ── 7. Remove markdown headings (keep the text) ──
    text = text.replace(/^#{1,6}\s+/gm, '')

    // ── 8. Remove markdown emphasis markers ──
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1')   // bold
    text = text.replace(/\*([^*]+)\*/g, '$1')        // italic
    text = text.replace(/__([^_]+)__/g, '$1')        // bold
    text = text.replace(/_([^_]+)_/g, '$1')          // italic
    text = text.replace(/~~([^~]+)~~/g, '$1')        // strikethrough

    // ── 9. Remove bullet / list markers ──
    text = text.replace(/^[\s]*[-*•▪▸►]\s*/gm, '')
    text = text.replace(/^\s*\d+[.)]\s*/gm, '')

    // ── 10. Remove markdown table syntax ──
    text = text.replace(/\|/g, ' ')
    text = text.replace(/^[-:]+$/gm, '')

    // ── 11. Remove blockquote markers ──
    text = text.replace(/^>\s*/gm, '')

    // ── 12. Remove horizontal rules ──
    text = text.replace(/^[-*_]{3,}\s*$/gm, '')

    // ── 13. Remove leftover special symbols ──
    text = text.replace(/[{}[\]<>\\=~^`]/g, ' ')

    // ── 14. Clean up repeated punctuation ──
    text = text.replace(/([.!?]){2,}/g, '$1')
    text = text.replace(/,{2,}/g, ',')
    text = text.replace(/([:;]){2,}/g, '$1')

    // ── 15. Fix common OCR artifacts ──
    text = text.replace(/\bPage\s+\d+\s*(of\s+\d+)?\b/gi, '') // "Page 3 of 10"
    text = text.replace(/\f/g, ' ')                             // form feeds

    // ── 16. Normalise whitespace ──
    text = text.replace(/[ \t]+/g, ' ')            // collapse spaces/tabs
    text = text.replace(/\n{3,}/g, '\n\n')          // max 2 newlines
    text = text.replace(/^\s+$/gm, '')              // blank lines

    // ── 17. Trim each line and the whole string ──
    text = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .join('\n')
        .trim()

    return text
}
