# AI Transcription → AI Note Generation Integration Guide

## For: AI Transcription Specialist

This guide explains how to integrate your AI transcription system with the AI Note Generation system.

## Integration Overview

When a telehealth session recording is transcribed, the resulting transcript can automatically trigger AI note generation, or the clinician can manually generate a note from the transcript.

## Database Models

### Your Work: SessionTranscript Model
```typescript
model SessionTranscript {
  id                   String   @id @default(uuid())
  sessionId            String
  session              TelehealthSession @relation("SessionTranscripts", fields: [sessionId], references: [id])

  // Transcript data
  transcriptText       String   @db.Text
  transcriptSegments   Json     // Speaker-labeled segments

  // Quality metrics
  transcriptionQuality String   // POOR, FAIR, GOOD, EXCELLENT
  confidence           Float

  // Status
  status               String   // PENDING, IN_PROGRESS, COMPLETED, FAILED

  // AWS Transcribe details
  jobId                String
  s3Key                String

  // Timestamps
  createdAt            DateTime @default(now())
  completedAt          DateTime?
}
```

### My Work: AIGeneratedNote Model
```typescript
model AIGeneratedNote {
  id             String   @id @default(uuid())
  sessionId      String   @unique
  appointmentId  String

  // Your transcript reference
  transcriptText String   @db.Text
  transcriptId   String?  // Links to your SessionTranscript.id

  // Generated content
  soapNote       Json
  riskAssessment Json

  // Status and metadata
  status         AIGeneratedNoteStatus
  ...
}
```

## Integration Points

### 1. After Transcription Completes

When your transcription job finishes, you can automatically trigger note generation:

```typescript
// In your transcription completion handler
import * as aiNoteService from './aiNoteGeneration.service';

async function onTranscriptionComplete(sessionId: string, transcript: SessionTranscript) {
  try {
    // Get session details for metadata
    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        appointment: {
          include: {
            client: true,
            clinician: true,
          },
        },
      },
    });

    if (!session) return;

    // Build session metadata
    const sessionMetadata = {
      sessionDate: session.sessionStartedAt?.toISOString() || new Date().toISOString(),
      sessionDuration: session.actualDuration || 50,
      sessionType: 'Telehealth',
      clientName: `${session.appointment.client.firstName} ${session.appointment.client.lastName}`,
      clinicianName: `${session.appointment.clinician.firstName} ${session.appointment.clinician.lastName}`,
    };

    // Trigger AI note generation
    const aiNote = await aiNoteService.generateSOAPNote(
      {
        sessionId: session.id,
        transcriptText: transcript.transcriptText,
        transcriptId: transcript.id, // Important: link back to your transcript
        sessionMetadata,
        noteType: 'PROGRESS_NOTE',
      },
      session.appointment.clinicianId // User who triggered this
    );

    logger.info('AI note generation triggered after transcription', {
      sessionId,
      transcriptId: transcript.id,
      aiNoteId: aiNote.id,
    });

    // Optional: Notify clinician that note is ready for review
    // await notificationService.notifyClinicianNoteReady(session.appointment.clinicianId, aiNote.id);

  } catch (error) {
    logger.error('Failed to generate AI note after transcription', {
      error: error.message,
      sessionId,
    });
    // Don't throw - transcription succeeded, note generation is optional
  }
}
```

### 2. Manual Trigger from Frontend

Alternatively, provide a "Generate Note from Transcript" button in your UI:

```typescript
// Frontend component (example)
import { aiNoteAPI } from '../lib/api';

function TranscriptViewer({ sessionId, transcript }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerateNote = async () => {
    setGenerating(true);
    try {
      const response = await aiNoteAPI.generate(sessionId, {
        transcriptText: transcript.transcriptText,
        transcriptId: transcript.id,
        sessionMetadata: {
          // ... build metadata
        },
      });

      // Navigate to note review page
      navigate(`/telehealth/sessions/${sessionId}/post-session-review`);
    } catch (error) {
      toast.error('Failed to generate note');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h3>Session Transcript</h3>
      <p>{transcript.transcriptText}</p>

      <button
        onClick={handleGenerateNote}
        disabled={generating}
      >
        {generating ? 'Generating...' : 'Generate Clinical Note from Transcript'}
      </button>
    </div>
  );
}
```

### 3. Quality Pass-Through

Pass your transcript quality assessment to note generation for better confidence scoring:

```typescript
// In your transcription service
const transcript = await prisma.sessionTranscript.create({
  data: {
    sessionId,
    transcriptText: text,
    transcriptionQuality: calculateQuality(confidence), // POOR/FAIR/GOOD/EXCELLENT
    confidence: confidence, // 0.0 to 1.0
    status: 'COMPLETED',
  },
});

// The AI note generation service will use transcriptionQuality
// to adjust confidence scores and add warnings if quality is poor
```

## Transcript Format Requirements

The AI note generation system works best with:

### Minimum Requirements
- **Length**: At least 200 characters
- **Format**: Plain text (not JSON, not with timestamps inline)
- **Content**: Complete sentences, coherent dialogue

### Optional Enhancements
- **Speaker labels**: "Clinician: ...\nClient: ..." (helps SOAP accuracy)
- **Timestamps**: Can be in separate metadata, not inline
- **Segment structure**: Store in `transcriptSegments` JSON field

### Example Good Transcript Format

```text
Clinician: How have you been feeling since our last session?

Client: I've been doing better overall. The anxiety hasn't been as overwhelming.

Clinician: That's great to hear. Can you tell me more about what's improved?

Client: I've been using the breathing techniques we discussed, and they really help when I start to feel anxious. I used them twice this week when I felt panic coming on.

Clinician: Excellent. It sounds like you're applying the skills effectively. Have you noticed any patterns about when the anxiety tends to come up?

Client: It's usually in the morning before work. I start worrying about everything I have to do that day.

[... continues ...]
```

### Example Poor Transcript Format (Avoid)

```text
00:00:15 ClncnHowHaveYouBeen
00:00:18 ClntIveBeenDoing...
[inaudible] anxiety [static] overwhelming
```

## Error Handling

Handle cases where note generation fails:

```typescript
try {
  await aiNoteService.generateSOAPNote(...);
} catch (error) {
  if (error.code === 'TRANSCRIPT_TOO_SHORT') {
    // Transcript too short - notify clinician to add manual note
    logger.warn('Transcript too short for AI note generation', { sessionId });
  } else if (error.code === 'API_ERROR') {
    // Claude API error - retry later or allow manual generation
    logger.error('AI API error', { error: error.message });
  }

  // Don't fail the transcription - note generation is optional
}
```

## Status Checking

Check if a note has been generated for a session:

```typescript
const session = await prisma.telehealthSession.findUnique({
  where: { id: sessionId },
  select: {
    aiNoteGenerated: true,
    aiNoteGeneratedAt: true,
    aiNoteId: true,
  },
});

if (session.aiNoteGenerated) {
  // Note exists - can show "View Generated Note" button
  const aiNote = await prisma.aIGeneratedNote.findUnique({
    where: { id: session.aiNoteId },
    select: {
      status: true,
      clinicianReviewed: true,
    },
  });

  // Show status: GENERATING, GENERATED, REVIEWED, APPROVED
}
```

## Database Relations

The relationship is:

```
TelehealthSession (1) ──┬──> (many) SessionTranscript (your work)
                        │
                        └──> (1) AIGeneratedNote (my work)
```

- A session can have multiple transcripts (if regenerated)
- A session can have one AI note
- The AI note references a transcript via `transcriptId`

## Frontend UI Integration

Suggested flow in UI:

1. **During Session**: Recording indicator shows
2. **After Session Ends**: "Processing transcript..." message
3. **Transcription Complete**: "View Transcript" button appears
4. **In Transcript View**: "Generate Clinical Note" button
5. **Generation In Progress**: Progress indicator (5-15 seconds)
6. **Note Generated**: Redirect to PostSessionReview page
7. **Review & Approve**: Clinician reviews, edits, approves
8. **Export**: Note exported to clinical notes

## Configuration Options

You can configure whether to auto-generate notes in practice settings:

```typescript
// Add to PracticeSettings or create TelehealthSettings
{
  autoGenerateNotesFromTranscript: boolean, // Auto-trigger after transcription
  notifyClinicianWhenNoteReady: boolean,    // Send notification
  requireTranscriptQuality: 'FAIR' | 'GOOD', // Minimum quality to generate
}
```

## Performance Considerations

- **Transcription**: Your work (AWS Transcribe) - varies by duration
- **Note Generation**: My work (Claude API) - 5-15 seconds
- **Total Time**: Transcription time + 5-15 seconds
- **Async Recommended**: Run note generation as background job

## Testing Together

Integration test scenario:

```typescript
describe('Transcription to Note Generation Flow', () => {
  it('should generate note after transcription completes', async () => {
    // 1. Create session
    const session = await createTestSession();

    // 2. Your work: Create transcript
    const transcript = await createSessionTranscript({
      sessionId: session.id,
      transcriptText: validTranscriptText,
      transcriptionQuality: 'GOOD',
      status: 'COMPLETED',
    });

    // 3. My work: Generate note
    const aiNote = await aiNoteService.generateSOAPNote({
      sessionId: session.id,
      transcriptText: transcript.transcriptText,
      transcriptId: transcript.id,
      sessionMetadata: testMetadata,
    }, clinicianId);

    // 4. Verify
    expect(aiNote.status).toBe('GENERATED');
    expect(aiNote.transcriptId).toBe(transcript.id);
    expect(aiNote.soapNote).toBeDefined();
    expect(aiNote.riskAssessment).toBeDefined();
  });
});
```

## Questions?

If you have questions about integration:
1. Check the full implementation report: `/docs/implementation-reports/MODULE_6_PHASE_2_AI_NOTE_GENERATION_IMPLEMENTATION_REPORT.md`
2. Review service code: `/packages/backend/src/services/aiNoteGeneration.service.ts`
3. Check API endpoints: `/packages/backend/src/controllers/aiNote.controller.ts`
4. See types: `/packages/backend/src/types/aiNote.types.ts`

## Summary Checklist

For seamless integration:

- [ ] Store transcript in `SessionTranscript` model
- [ ] Set `transcriptionQuality` field (POOR/FAIR/GOOD/EXCELLENT)
- [ ] Call `aiNoteService.generateSOAPNote()` after transcription completes (or on button click)
- [ ] Pass `transcriptId` to link back to your transcript
- [ ] Handle errors gracefully (don't fail transcription if note generation fails)
- [ ] Update `TelehealthSession.aiNoteGenerated` flag (done automatically by my service)
- [ ] Provide UI to view generated note (frontend component needed)
- [ ] Test end-to-end flow with real session

Let me know if you need any clarification or have integration questions!
