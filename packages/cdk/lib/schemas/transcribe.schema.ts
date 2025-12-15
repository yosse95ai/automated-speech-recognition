import { z } from 'zod';

/**
 * Transcribe language codes supported by AWS Transcribe
 */
export const transcribeLanguageCodeSchema = z.enum([
  'ja-JP',
  'en-US',
  'en-GB',
  'es-US',
  'fr-FR',
  'de-DE',
  'pt-BR',
  'zh-CN',
  'ko-KR',
  'it-IT',
  'nl-NL',
  'ru-RU',
  'ar-SA',
  'hi-IN',
  'th-TH',
  'tr-TR',
], {
  errorMap: () => ({ message: 'サポートされていない言語コードです' }),
});

/**
 * Transcribe media format
 */
export const transcribeMediaFormatSchema = z.enum([
  'mp3',
  'mp4',
  'wav',
  'flac',
  'ogg',
  'amr',
  'webm',
], {
  errorMap: () => ({ message: 'サポートされていないメディアフォーマットです' }),
});

/**
 * Transcribe input configuration
 */
export const transcribeInputSchema = z.object({
  s3Uri: z.string()
    .url({ message: 'S3 URIの形式が不正です' })
    .regex(/^s3:\/\/[a-z0-9][a-z0-9.-]*[a-z0-9]\/.*/, {
      message: 'S3 URIは s3://bucket-name/key の形式である必要があります',
    }),
  languageCode: transcribeLanguageCodeSchema,
  mediaFormat: transcribeMediaFormatSchema.optional(),
  mediaSampleRateHertz: z.number()
    .int({ message: 'サンプルレートは整数である必要があります' })
    .min(8000, { message: 'サンプルレートは8000Hz以上である必要があります' })
    .max(48000, { message: 'サンプルレートは48000Hz以下である必要があります' })
    .optional(),
  showSpeakerLabels: z.boolean().optional(),
  maxSpeakerLabels: z.number()
    .int({ message: '話者数は整数である必要があります' })
    .min(2, { message: '話者数は2人以上である必要があります' })
    .max(10, { message: '話者数は10人以下である必要があります' })
    .optional(),
});

/**
 * Transcribe word alternative
 */
const transcribeAlternativeSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  content: z.string(),
});

/**
 * Transcribe word item
 */
const transcribeItemSchema = z.object({
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  type: z.enum(['pronunciation', 'punctuation']),
  content: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  speakerLabel: z.string().optional(),
  alternatives: z.array(transcribeAlternativeSchema).optional(),
});

/**
 * Transcribe output transcript
 */
const transcribeTranscriptSchema = z.object({
  transcript: z.string(),
});

/**
 * Transcribe output results
 */
const transcribeResultsSchema = z.object({
  transcripts: z.array(transcribeTranscriptSchema),
  items: z.array(transcribeItemSchema).optional(),
  speakerLabels: z.object({
    speakers: z.number().int(),
    segments: z.array(z.object({
      startTime: z.number(),
      endTime: z.number(),
      speakerLabel: z.string(),
    })),
  }).optional(),
});

/**
 * Transcribe output configuration
 */
export const transcribeOutputSchema = z.object({
  jobName: z.string(),
  accountId: z.string(),
  status: z.enum(['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
  results: transcribeResultsSchema.optional(),
});

/**
 * Infer TypeScript types from schemas
 */
export type TranscribeInput = z.infer<typeof transcribeInputSchema>;
export type TranscribeOutput = z.infer<typeof transcribeOutputSchema>;
export type TranscribeLanguageCode = z.infer<typeof transcribeLanguageCodeSchema>;
export type TranscribeMediaFormat = z.infer<typeof transcribeMediaFormatSchema>;

/**
 * Validates Transcribe input configuration
 * @param data - Raw input data
 * @returns Validated input configuration
 * @throws ZodError with Japanese error messages if validation fails
 */
export function validateTranscribeInput(data: unknown): TranscribeInput {
  return transcribeInputSchema.parse(data);
}

/**
 * Validates Transcribe output
 * @param data - Raw output data
 * @returns Validated output
 * @throws ZodError if validation fails
 */
export function validateTranscribeOutput(data: unknown): TranscribeOutput {
  return transcribeOutputSchema.parse(data);
}

/**
 * Safely validates Transcribe input without throwing
 * @param data - Raw input data
 * @returns Success result with data or error result with messages
 */
export function safeValidateTranscribeInput(data: unknown) {
  const result = transcribeInputSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });
    return { success: false as const, errors };
  }
  
  return { success: true as const, data: result.data };
}
