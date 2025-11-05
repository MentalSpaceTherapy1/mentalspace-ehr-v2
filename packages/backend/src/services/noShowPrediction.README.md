# No-Show Risk Prediction Service

## Overview

The NoShowPredictionService provides AI-powered no-show risk prediction for appointments. It analyzes historical client behavior, appointment characteristics, and temporal patterns to predict the likelihood of a client not showing up for their scheduled appointment.

## Key Features

- **Multi-Factor Risk Analysis**: Combines historical behavior, temporal patterns, and confirmation status
- **Real-Time Prediction**: Calculate risk score when appointments are created or modified
- **Risk Categorization**: LOW/MEDIUM/HIGH risk levels for easy interpretation
- **Batch Processing**: Recalculate risks for all upcoming appointments
- **Model Tracking**: Log predictions for accuracy evaluation and model improvement
- **Confidence Scoring**: Indicate prediction confidence based on available data

## Risk Calculation Algorithm

### Base Risk Model

The prediction uses a rule-based scoring system that starts with a base risk of **10%** and adds risk based on various factors:

#### Historical Factors (Strongest Predictors)
- **New Client**: +15% (no historical data to assess reliability)
- **High No-Show Rate (>20%)**: +30% (pattern of missed appointments)
- **Very High No-Show Rate (>40%)**: +50% total (severe reliability issues)
- **High Cancellation Rate (>30%)**: +10% (pattern of unreliability)

#### Confirmation Status
- **Not Confirmed**: +15% (unconfirmed appointments more likely to be missed)

#### Lead Time Factors
- **Far Future Booking (>30 days)**: +10% (easier to forget, plans may change)
- **Last Minute Booking (<2 days)**: +5% (indicates lower commitment)

#### Temporal Factors
- **Off-Peak Hours** (before 9 AM or after 5 PM): +5% (harder to keep)
- **Monday Appointments**: +5% (historically higher no-show rates)

### Risk Levels

Risk scores are categorized into three levels:

| Risk Level | Score Range | Description |
|------------|-------------|-------------|
| **HIGH** | ≥ 60% | Significant no-show risk - recommend extra outreach |
| **MEDIUM** | 30-59% | Moderate risk - standard reminder protocols |
| **LOW** | < 30% | Minimal risk - reliable client |

### Maximum Risk Cap

Risk scores are capped at **95%** to acknowledge that perfect prediction is impossible and to maintain reasonable expectations.

## Usage Examples

### Calculate Risk for New Appointment

```typescript
import { noShowPredictionService } from './services/noShowPrediction.service';

// Calculate risk when appointment is created
const prediction = await noShowPredictionService.calculateRisk(appointmentId);

console.log(`Risk Score: ${(prediction.riskScore * 100).toFixed(1)}%`);
console.log(`Risk Level: ${prediction.riskLevel}`);
console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
console.log(`Risk Factors:`, prediction.riskFactors);

// Take action based on risk level
if (prediction.riskLevel === 'HIGH') {
  // Send additional reminders
  // Consider confirmation call
  // Schedule follow-up outreach
}
```

### Batch Recalculation

```typescript
// Recalculate risks for all appointments in next 30 days
const results = await noShowPredictionService.recalculateAllRisks(30);

console.log(`Processed: ${results.processed}`);
console.log(`Failed: ${results.failed}`);
```

### Update Prediction Outcome

```typescript
// After appointment occurs, update prediction log with actual outcome
// This helps improve model accuracy over time
await noShowPredictionService.updatePredictionOutcome(
  appointmentId,
  didNoShow // true if client no-showed
);
```

### Get Model Accuracy

```typescript
// Evaluate model performance over a time period
const accuracy = await noShowPredictionService.getModelAccuracy(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

console.log(`Accuracy: ${(accuracy.accuracy * 100).toFixed(1)}%`);
console.log(`Precision: ${(accuracy.precision * 100).toFixed(1)}%`);
console.log(`Recall: ${(accuracy.recall * 100).toFixed(1)}%`);
```

## Integration Points

### 1. Appointment Creation

```typescript
// In appointment creation service
const appointment = await prisma.appointment.create({
  data: appointmentData
});

// Calculate no-show risk
const prediction = await noShowPredictionService.calculateRisk(appointment.id);

// Use prediction to determine reminder strategy
if (prediction.riskLevel === 'HIGH') {
  // Enable extra reminders
  await scheduleAdditionalReminders(appointment.id);
}
```

### 2. Appointment Rescheduling

```typescript
// Recalculate risk when appointment is rescheduled
await noShowPredictionService.calculateRisk(appointmentId);
```

### 3. Confirmation Response

```typescript
// When client confirms appointment, recalculate risk
// Risk should decrease after confirmation
await prisma.appointment.update({
  where: { id: appointmentId },
  data: { status: 'CONFIRMED' }
});

await noShowPredictionService.calculateRisk(appointmentId);
```

### 4. Status Updates

```typescript
// When appointment status changes to NO_SHOW or COMPLETED
await prisma.appointment.update({
  where: { id: appointmentId },
  data: { status: 'NO_SHOW' }
});

// Update prediction outcome for model learning
await noShowPredictionService.updatePredictionOutcome(
  appointmentId,
  true // did no-show
);
```

### 5. Scheduled Jobs

```typescript
// Daily job to recalculate risks for upcoming appointments
import { CronJob } from 'cron';

const riskRecalculationJob = new CronJob(
  '0 2 * * *', // Run at 2 AM daily
  async () => {
    try {
      const results = await noShowPredictionService.recalculateAllRisks(30);
      console.log('Risk recalculation complete:', results);
    } catch (error) {
      console.error('Risk recalculation failed:', error);
    }
  }
);

riskRecalculationJob.start();
```

## Risk Factors Reference

The service identifies and reports the following risk factors:

| Factor | Trigger Condition | Description |
|--------|------------------|-------------|
| `new_client` | No appointment history | First-time clients have higher no-show rates |
| `high_noshow_history` | No-show rate > 20% | Client has missed >20% of past appointments |
| `very_high_noshow_history` | No-show rate > 40% | Client has missed >40% of past appointments |
| `high_cancellation_rate` | Cancellation rate > 30% | Client frequently cancels appointments |
| `not_confirmed` | Status != CONFIRMED | Appointment not yet confirmed by client |
| `far_future_booking` | Lead time > 30 days | Booked more than a month in advance |
| `last_minute_booking` | Lead time < 2 days | Booked within 2 days of appointment |
| `off_peak_hours` | Before 9 AM or after 5 PM | Outside standard business hours |
| `monday_appointment` | Day of week = Monday | Monday appointments have higher no-show rates |

## Confidence Scoring

Confidence increases with more historical data:

| Appointment Count | Confidence |
|------------------|------------|
| 0 (new client) | 50% |
| 1-9 appointments | 50% + (count × 4.5%) |
| 10+ appointments | 95% |

Higher confidence means the prediction is based on more data and is likely more accurate.

## Database Schema Requirements

### Required Schema Changes

The service expects these fields on the Appointment model:

```prisma
model Appointment {
  // ... existing fields ...

  // No-Show Risk Prediction
  noShowRiskScore     Float?    // 0.0 to 1.0
  noShowRiskLevel     String?   // LOW, MEDIUM, HIGH
  noShowRiskFactors   String[]  // Array of risk factor identifiers
  riskCalculatedAt    DateTime?
}
```

### Prediction Logging (Optional but Recommended)

For model evaluation and improvement:

```prisma
model NoShowPredictionLog {
  id              String   @id @default(uuid())
  appointmentId   String
  predictedRisk   Float
  actualNoShow    Boolean?
  features        Json     // Store features used for prediction
  modelVersion    String
  createdAt       DateTime @default(now())

  appointment Appointment @relation(fields: [appointmentId], references: [id])

  @@index([appointmentId])
  @@index([createdAt])
}
```

### Migration Script

```bash
# Generate migration after updating schema
npx prisma migrate dev --name add_noshow_risk_prediction

# Apply migration
npx prisma migrate deploy
```

## Performance Considerations

### Batch Processing

The `recalculateAllRisks` method processes appointments in batches of 50 to avoid overwhelming the database:

```typescript
// Processes in batches of 50
const BATCH_SIZE = 50;
```

### Caching

Consider implementing caching for risk scores that don't change frequently:

```typescript
// Cache risk scores for 1 hour
const cachedRisk = await cache.get(`risk:${appointmentId}`);
if (cachedRisk && !forceRecalculate) {
  return JSON.parse(cachedRisk);
}

const prediction = await service.calculateRisk(appointmentId);
await cache.set(`risk:${appointmentId}`, JSON.stringify(prediction), 3600);
```

## Error Handling

The service handles errors gracefully:

- **Appointment Not Found**: Throws error with clear message
- **Database Errors**: Logs error but doesn't crash
- **Schema Not Updated**: Logs prediction instead of failing
- **Batch Processing Failures**: Continues processing, tracks failed count

## Testing

Comprehensive test suite included at:
```
packages/backend/src/services/__tests__/noShowPrediction.service.test.ts
```

Run tests:
```bash
npm test noShowPrediction.service.test.ts
```

Test coverage includes:
- Risk calculation for various scenarios
- Risk level categorization
- Confidence scoring
- Batch processing
- Error handling
- Edge cases

## Monitoring and Metrics

### Key Metrics to Track

1. **Prediction Accuracy**: Percentage of correct predictions
2. **Precision**: Of predicted no-shows, how many actually happened
3. **Recall**: Of actual no-shows, how many were predicted
4. **Risk Distribution**: How many appointments in each risk level
5. **Intervention Effectiveness**: No-show rate reduction for high-risk appointments

### Logging

The service logs:
- Risk calculations with scores and factors
- Batch processing results
- Prediction outcomes
- Model accuracy calculations
- Errors and warnings

## Future Enhancements

### Planned Improvements

1. **Machine Learning Model**: Replace rule-based model with trained ML model
2. **Weather Integration**: Factor in weather conditions for appointment day
3. **Distance/Transportation**: Consider client distance from office
4. **Insurance Status**: Factor in insurance verification status
5. **Provider-Specific Models**: Customize predictions per provider
6. **A/B Testing**: Test different intervention strategies

### Model Retraining

Once sufficient data is collected:

```typescript
// Collect prediction outcomes
const historicalData = await prisma.noShowPredictionLog.findMany({
  where: {
    actualNoShow: { not: null },
    createdAt: { gte: trainingStartDate }
  }
});

// Train new model
const model = await trainNoShowModel(historicalData);

// Deploy new model version
service.MODEL_VERSION = '2.0.0';
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review prediction accuracy
2. **Monthly**: Analyze risk factor distribution
3. **Quarterly**: Evaluate model performance and consider retraining
4. **Annually**: Review and update risk thresholds based on data

### Troubleshooting

**Low Prediction Accuracy**:
- Check if risk thresholds need adjustment
- Review if new risk factors should be added
- Ensure prediction outcomes are being logged correctly

**High False Positive Rate**:
- Consider increasing HIGH risk threshold
- Review if certain factors are over-weighted

**High False Negative Rate**:
- Consider decreasing risk thresholds
- Add additional risk factors

## References

- Implementation Plan: `docs/prd/MODULE_3_IMPLEMENTATION_PLAN.md` (lines 1357-1501)
- Clinical research on appointment no-shows
- Historical no-show patterns in mental health practices

## Version History

- **1.0.0** (Initial): Rule-based prediction model with 9 risk factors
- Future versions will incorporate machine learning models

## License

Internal use only - MentalSpace EHR
