# Script to add AI Scheduling Assistant relation fields to Prisma schema

$schemaPath = "packages\database\prisma\schema.prisma"
$content = Get-Content $schemaPath -Raw

# 1. Add relations to User model (before line with @@map("users"))
$userRelations = @"

  // Module 3 Phase 4: AI Scheduling Assistant
  schedulingSuggestionsAsProvider          SchedulingSuggestion[]         @relation("SuggestionProvider")
  schedulingSuggestionsAsSuggestedProvider SchedulingSuggestion[]         @relation("SuggestedProvider")
  providerCompatibilityScores              ProviderClientCompatibility[]  @relation("CompatibilityProvider")
  schedulingPatternsAsProvider             SchedulingPattern[]            @relation("PatternProvider")
  schedulingPatternsAsResolver             SchedulingPattern[]            @relation("PatternResolver")
  nlpSchedulingLogs                        NaturalLanguageSchedulingLog[]
"@

# Find and replace in User model - add before @@map("users")
$content = $content -replace '(  timeOffAsCoverage  TimeOffRequest\[\]       @relation\("TimeOffCoverage"\)\r?\n)\r?\n(  @@map\("users"\))', "`$1$userRelations`n`n`$2"

# 2. Add relations to Client model (before @@map("clients"))
$clientRelations = @"

  // Module 3 Phase 4: AI Scheduling Assistant
  schedulingSuggestions SchedulingSuggestion[]
  compatibilityScores   ProviderClientCompatibility[]
  schedulingPatterns    SchedulingPattern[]
"@

$content = $content -replace '(  groupMemberships GroupMember\[\]\r?\n)\r?\n(  @@map\("clients"\))', "`$1$clientRelations`n`n`$2"

# 3. Add relations to Appointment model (before @@map("appointments"))
$appointmentRelations = @"

  // Module 3 Phase 4: AI Scheduling Assistant - NLP Created Appointments
  nlpSchedulingLogs NaturalLanguageSchedulingLog[] @relation("NLPCreatedAppointment")
"@

$content = $content -replace '(  attendance     GroupAttendance\[\]\r?\n)\r?\n(  @@map\("appointments"\))', "`$1$appointmentRelations`n`n`$2"

# 4. Add relations to AppointmentType model (before @@map("appointment_types"))
$appointmentTypeRelations = @"

  // Module 3 Phase 4: AI Scheduling Assistant
  schedulingSuggestions SchedulingSuggestion[]
  schedulingPatterns    SchedulingPattern[]
"@

$content = $content -replace '(  groupSessions GroupSession\[\]\r?\n)\r?\n(  @@map\("appointment_types"\))', "`$1$appointmentTypeRelations`n`n`$2"

# Write the modified content back
$content | Set-Content $schemaPath -NoNewline

Write-Host "Successfully added AI Scheduling Assistant relations to schema.prisma" -ForegroundColor Green
