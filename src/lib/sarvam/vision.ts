// Sarvam Document Intelligence (Vision OCR) Client
// API: Async job-based system
// Docs: https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/document-intelligence

const BASE_URL = 'https://api.sarvam.ai/doc-digitization/job/v1'

export interface VisionExtractOptions {
    file: Blob
    language: string
    filename?: string
}

export interface VisionExtractResult {
    text: string
    confidence: number
    pages: number
    request_id: string
}

export class SarvamVisionClient {
    private apiKey: string

    constructor() {
        this.apiKey = process.env.SARVAM_API_KEY!
    }

    async extractText(options: VisionExtractOptions): Promise<VisionExtractResult> {
        const headers = {
            'api-subscription-key': this.apiKey,
        }

        const lang = this.formatLanguageCode(options.language)
        console.log(`[Sarvam Vision] Creating job for language: ${lang}`)

        // Step 1: Create a Document Intelligence job
        const createRes = await fetch(`${BASE_URL}`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_parameters: {
                    language: lang,
                    output_format: 'md',
                },
            }),
        })

        if (!createRes.ok) {
            const err = await createRes.text()
            throw new Error(`Sarvam Vision create job error: ${createRes.status} - ${err}`)
        }

        const createData = await createRes.json()
        const job_id: string = createData.job_id
        console.log(`[Sarvam Vision] Job created: ${job_id}`)

        // Step 2a: Get presigned upload URL (POST to /upload-files with job_id + filenames)
        const filename = options.filename || `doc_${Date.now()}.${this.getExtension(options.file.type)}`
        console.log(`[Sarvam Vision] Getting upload URL for: ${filename}`)

        const uploadUrlRes = await fetch(`${BASE_URL}/upload-files`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id, files: [filename] }),
        })

        if (!uploadUrlRes.ok) {
            const err = await uploadUrlRes.text()
            throw new Error(`Sarvam Vision get-upload-url error: ${uploadUrlRes.status} - ${err}`)
        }

        const uploadUrlData = await uploadUrlRes.json()
        console.log(`[Sarvam Vision] Upload URL response keys:`, Object.keys(uploadUrlData))

        // SDK: response.upload_urls is a dict of { filename: { file_url } }
        const presignedUrl: string = uploadUrlData.upload_urls?.[filename]?.file_url

        if (!presignedUrl) {
            throw new Error(`Sarvam Vision: no upload URL in response: ${JSON.stringify(uploadUrlData)}`)
        }

        // Step 2b: PUT the file to the presigned Azure Blob Storage URL
        console.log(`[Sarvam Vision] Uploading file: ${filename} (${options.file.size} bytes)`)

        const contentType = options.file.type || 'application/octet-stream'
        const putRes = await fetch(presignedUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
                'x-ms-blob-type': 'BlockBlob', // Required for Azure Blob Storage
            },
            body: options.file,
        })

        if (!putRes.ok) {
            const err = await putRes.text()
            throw new Error(`Sarvam Vision file PUT error: ${putRes.status} - ${err}`)
        }
        console.log(`[Sarvam Vision] File uploaded successfully`)

        // Step 3: Start the job
        const startRes = await fetch(`${BASE_URL}/${job_id}/start`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
        })

        if (!startRes.ok) {
            const err = await startRes.text()
            throw new Error(`Sarvam Vision start error: ${startRes.status} - ${err}`)
        }
        console.log(`[Sarvam Vision] Job started`)

        // Step 4: Poll for completion (max 180s)
        const jobStatus = await this.pollJobStatus(job_id, headers, 180)
        const pages = jobStatus.page_metrics?.pages_processed ?? 1
        console.log(`[Sarvam Vision] Job completed: ${pages} page(s)`)

        // Step 5: Get presigned download URL (POST to /download-files) then GET the file
        const downloadLinksRes = await fetch(`${BASE_URL}/${job_id}/download-files`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
        })

        if (!downloadLinksRes.ok) {
            const err = await downloadLinksRes.text()
            throw new Error(`Sarvam Vision get-download-links error: ${downloadLinksRes.status} - ${err}`)
        }

        const downloadLinksData = await downloadLinksRes.json()
        console.log(`[Sarvam Vision] Download links response keys:`, Object.keys(downloadLinksData))

        // SDK: response.download_urls is a dict of { filename: { file_url } }
        const downloadUrls: Record<string, { file_url: string }> = downloadLinksData.download_urls ?? {}
        const firstDownloadKey = Object.keys(downloadUrls)[0]
        const downloadPresignedUrl = firstDownloadKey ? downloadUrls[firstDownloadKey].file_url : undefined

        if (!downloadPresignedUrl) {
            throw new Error(`Sarvam Vision: no download URL in response: ${JSON.stringify(downloadLinksData)}`)
        }

        const downloadRes = await fetch(downloadPresignedUrl)
        if (!downloadRes.ok) {
            throw new Error(`Sarvam Vision download error: ${downloadRes.status}`)
        }

        const zipBuffer = await downloadRes.arrayBuffer()
        const text = await this.extractTextFromZip(zipBuffer)
        console.log(`[Sarvam Vision] Text extracted: ${text.length} chars`)

        return {
            text,
            confidence: 0.95,
            pages,
            request_id: job_id,
        }
    }

    private async pollJobStatus(
        jobId: string,
        headers: Record<string, string>,
        timeoutSecs: number
    ): Promise<{ job_state: string; page_metrics?: { pages_processed: number } }> {
        const startTime = Date.now()

        while (Date.now() - startTime < timeoutSecs * 1000) {
            const statusRes = await fetch(`${BASE_URL}/${jobId}/status`, { headers })
            if (!statusRes.ok) throw new Error(`Sarvam Vision status check failed: ${statusRes.status}`)

            const status = await statusRes.json()
            const { job_state } = status

            if (job_state === 'Completed' || job_state === 'PartiallyCompleted') {
                return status
            }

            if (job_state === 'Failed') {
                throw new Error(`Sarvam Vision job failed for job_id: ${jobId}`)
            }

            // Wait 3s before next poll
            await new Promise((resolve) => setTimeout(resolve, 3000))
        }

        throw new Error(`Sarvam Vision job timed out after ${timeoutSecs}s`)
    }

    private async extractTextFromZip(zipBuffer: ArrayBuffer): Promise<string> {
        // Dynamic import of fflate for ZIP extraction (lightweight)
        try {
            const { unzipSync } = await import('fflate')
            const files = unzipSync(new Uint8Array(zipBuffer))
            const decoder = new TextDecoder('utf-8')

            // Find the first .md, .txt, or .html file in the ZIP
            for (const name of Object.keys(files)) {
                if (name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.html')) {
                    return decoder.decode(files[name])
                }
            }

            // Fallback: concatenate all file content
            return Object.keys(files)
                .map((name) => decoder.decode(files[name]))
                .join('\n\n')
        } catch (_e) {
            // If ZIP parsing fails, try to decode raw buffer as text
            return new TextDecoder('utf-8').decode(zipBuffer)
        }
    }

    private formatLanguageCode(lang: string): string {
        // Map short codes to BCP-47 format expected by Sarvam
        const langMap: Record<string, string> = {
            hi: 'hi-IN',
            ta: 'ta-IN',
            te: 'te-IN',
            kn: 'kn-IN',
            ml: 'ml-IN',
            bn: 'bn-IN',
            gu: 'gu-IN',
            mr: 'mr-IN',
            pa: 'pa-IN',
            od: 'od-IN',
            as: 'as-IN',
            ur: 'ur-IN',
            en: 'en-IN',
        }
        return langMap[lang] ?? `${lang}-IN`
    }

    private getExtension(mimeType: string): string {
        const extMap: Record<string, string> = {
            'application/pdf': 'pdf',
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
        }
        return extMap[mimeType] ?? 'pdf'
    }
}
