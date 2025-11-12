# Export & Integration Testing Guide

## Quick Start

### 1. Install Dependencies

```bash
cd packages/backend
npm install
```

This will install:
- `puppeteer` (PDF generation)
- `exceljs` (Excel generation)
- `archiver` (ZIP creation)

### 2. Start the Backend

```bash
cd packages/backend
npm run dev
```

### 3. Test Export Endpoints

#### Export to PDF
```bash
curl -X POST http://localhost:5000/api/v1/reports/test-123/export/pdf \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "revenue-by-clinician"
  }'
```

#### Export to Excel
```bash
curl -X POST http://localhost:5000/api/v1/reports/test-123/export/excel \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "kvr-analysis"
  }'
```

#### Export to CSV
```bash
curl -X POST http://localhost:5000/api/v1/reports/test-123/export/csv \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "client-demographics"
  }'
```

#### Bulk Export
```bash
curl -X POST http://localhost:5000/api/v1/reports/bulk-export \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reports": [
      {"reportId": "1", "reportType": "revenue-by-clinician"},
      {"reportId": "2", "reportType": "kvr-analysis"},
      {"reportId": "3", "reportType": "revenue-by-cpt"}
    ],
    "format": "pdf"
  }'
```

#### Download Export
```bash
# Copy the filename from the export response
curl http://localhost:5000/api/v1/exports/download/report-revenue-by-clinician-123-1234567890.pdf \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output test-report.pdf
```

#### View Export History
```bash
curl http://localhost:5000/api/v1/exports/history?limit=20&offset=0 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Testing Power BI Integration

### 1. Get Available OData Feeds
```bash
curl http://localhost:5000/api/v1/odata \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Get OData Metadata
```bash
curl "http://localhost:5000/api/v1/odata/RevenueByClincian?\$metadata" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get OData Data
```bash
curl "http://localhost:5000/api/v1/odata/RevenueByClincian?\$top=10&\$skip=0&startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Connect from Power BI Desktop

1. Open Power BI Desktop
2. Click "Get Data" → "OData feed"
3. Enter URL: `http://localhost:5000/api/v1/odata/RevenueByClincian`
4. Click "Advanced" → "Add query parameter"
   - Name: `startDate`, Value: `2025-01-01`
   - Name: `endDate`, Value: `2025-01-31`
5. Click "OK"
6. In Authentication dialog:
   - Select "Organizational account"
   - Or select "Anonymous" and manually add Authorization header
7. Click "Sign in" (or "Connect" for anonymous)
8. Select the entity set
9. Click "Load"
10. Create visualizations!

**Alternative Method (Bearer Token)**:
1. Get Data → "Blank Query"
2. Go to Advanced Editor
3. Paste this M code:
```m
let
    Source = OData.Feed(
        "http://localhost:5000/api/v1/odata/RevenueByClincian?startDate=2025-01-01&endDate=2025-01-31",
        null,
        [
            Headers = [
                #"Authorization" = "Bearer YOUR_TOKEN_HERE"
            ]
        ]
    )
in
    Source
```

---

## Testing Tableau Integration

### 1. Get Available Reports
```bash
curl http://localhost:5000/api/v1/tableau/reports \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Get Schema for Report
```bash
curl http://localhost:5000/api/v1/tableau/schema/revenue-by-clinician \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get Data for Report
```bash
curl "http://localhost:5000/api/v1/tableau/data/revenue-by-clinician?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Connect from Tableau Desktop

1. Start the frontend (Tableau WDC page):
```bash
cd packages/frontend
npm run dev
```

2. Open Tableau Desktop
3. Connect → "Web Data Connector"
4. Enter URL: `http://localhost:3000/tableau-wdc.html`
5. Fill in the form:
   - **API Base URL**: `http://localhost:5000/api/v1`
   - **API Token**: Your authentication token
   - **Report Type**: Select from dropdown (e.g., "Revenue by Clinician")
   - **Start Date**: `2025-01-01` (optional)
   - **End Date**: `2025-01-31` (optional)
6. Click "Connect to Tableau"
7. Wait for data to load
8. Click "Update Now" or "Go to Worksheet"
9. Create visualizations!

**Troubleshooting**:
- If connection fails, check browser console (F12)
- Verify API token is valid
- Make sure backend is running
- Check CORS settings if cross-origin issues occur

---

## Sample Export Files

After running the tests, check the exports directory:

```bash
ls -lh packages/backend/exports/
```

You should see files like:
- `report-revenue-by-clinician-123-1699999999999.pdf`
- `report-kvr-analysis-123-1699999999999.xlsx`
- `report-client-demographics-123-1699999999999.csv`
- `bulk-export-1699999999999.zip`

---

## Expected Response Formats

### Successful Export Response
```json
{
  "success": true,
  "data": {
    "filename": "report-revenue-by-clinician-123-1699999999999.pdf",
    "downloadUrl": "/api/v1/exports/download/report-revenue-by-clinician-123-1699999999999.pdf",
    "size": 145678,
    "format": "PDF"
  }
}
```

### Export History Response
```json
{
  "success": true,
  "data": {
    "exports": [
      {
        "filename": "report-revenue-by-clinician-123-1699999999999.pdf",
        "format": "PDF",
        "size": 145678,
        "createdAt": "2025-11-10T12:34:56.789Z",
        "downloadUrl": "/api/v1/exports/download/report-revenue-by-clinician-123-1699999999999.pdf"
      }
    ],
    "total": 25,
    "limit": 20,
    "offset": 0
  }
}
```

### OData Response
```json
{
  "@odata.context": "http://localhost:5000/api/v1/odata/$metadata#RevenueByClincian",
  "@odata.count": 10,
  "value": [
    {
      "Id": "1",
      "ClinicianId": "clinician-123",
      "ClinicianName": "Dr. Jane Smith",
      "TotalRevenue": 125000.00,
      "SessionCount": 250,
      "AveragePerSession": 500.00,
      "Period": "1/1/2025 - 1/31/2025",
      "@odata.id": "http://localhost:5000/api/v1/odata/RevenueByClincian(0)",
      "@odata.etag": "W/\"1699999999999\""
    }
  ]
}
```

---

## Verify File Contents

### PDF
```bash
# Open the PDF
open packages/backend/exports/report-revenue-by-clinician-*.pdf
# or on Linux:
xdg-open packages/backend/exports/report-revenue-by-clinician-*.pdf
```

**Expected**:
- MentalSpace EHR header with logo
- Report title and period
- Summary cards with metrics
- Formatted data table
- Professional styling

### Excel
```bash
# Open the Excel file
open packages/backend/exports/report-kvr-analysis-*.xlsx
```

**Expected**:
- Multiple worksheets (if applicable)
- Bold, colored headers
- Formatted numbers (currency, percentages)
- Auto-sized columns
- Formulas in totals row

### CSV
```bash
# View the CSV
cat packages/backend/exports/report-client-demographics-*.csv
```

**Expected**:
- UTF-8 with BOM (for Excel compatibility)
- Summary header
- Comma-separated values
- Properly quoted fields
- Escaped special characters

---

## Error Testing

### Test Invalid Report Type
```bash
curl -X POST http://localhost:5000/api/v1/reports/test-123/export/pdf \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "invalid-report-type"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "message": "Failed to export report to PDF",
  "error": "Unknown report type: invalid-report-type"
}
```

### Test Missing Authentication
```bash
curl -X POST http://localhost:5000/api/v1/reports/test-123/export/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "revenue-by-clinician"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

## Performance Testing

### Single Export
```bash
time curl -X POST http://localhost:5000/api/v1/reports/test-123/export/pdf \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "revenue-by-clinician"
  }'
```

**Expected Time**:
- PDF: 2-5 seconds
- Excel: 1-3 seconds
- CSV: <1 second

### Bulk Export
```bash
time curl -X POST http://localhost:5000/api/v1/reports/bulk-export \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reports": [
      {"reportId": "1", "reportType": "revenue-by-clinician"},
      {"reportId": "2", "reportType": "kvr-analysis"},
      {"reportId": "3", "reportType": "revenue-by-cpt"},
      {"reportId": "4", "reportType": "revenue-by-payer"},
      {"reportId": "5", "reportType": "client-demographics"}
    ],
    "format": "pdf"
  }'
```

**Expected Time**: 10-25 seconds for 5 reports

---

## Cleanup

### Delete Single Export
```bash
curl -X DELETE http://localhost:5000/api/v1/exports/report-revenue-by-clinician-123-1699999999999.pdf \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Cleanup Old Exports (Admin Only)
```bash
curl -X POST http://localhost:5000/api/v1/exports/cleanup \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

**Response**:
```json
{
  "success": true,
  "message": "Deleted 5 export file(s) older than 30 days"
}
```

---

## Troubleshooting

### Puppeteer Issues

**Error**: "Chromium not found"
**Solution**:
```bash
# Install Chromium system-wide
sudo apt-get install -y chromium-browser

# Or let Puppeteer download Chromium
cd packages/backend
npx puppeteer browsers install chrome
```

### ExcelJS Issues

**Error**: "Excel file is corrupted"
**Solution**:
```bash
# Reinstall ExcelJS
npm uninstall exceljs
npm install exceljs@latest
```

### CORS Issues (Tableau WDC)

**Error**: "Cross-origin request blocked"
**Solution**: Add to backend CORS config:
```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  credentials: true
}));
```

---

## Next Steps

1. ✅ Run all test commands above
2. ✅ Verify file outputs
3. ✅ Test Power BI connection
4. ✅ Test Tableau WDC
5. ⏳ Integrate export buttons into frontend
6. ⏳ Create export history page UI
7. ⏳ Add to production deployment

---

## Success Checklist

- [ ] All export formats generate valid files (PDF, Excel, CSV)
- [ ] Bulk export creates valid ZIP file
- [ ] Export history endpoint returns data
- [ ] Downloads stream correctly
- [ ] Power BI OData feed connects successfully
- [ ] Tableau WDC loads data correctly
- [ ] Authentication works on all endpoints
- [ ] Error handling displays helpful messages
- [ ] File cleanup works correctly

---

**Last Updated**: November 10, 2025
**Status**: Ready for Testing
