Write-Host '=== CURRENT IMPLEMENTATION REVIEW ===' -ForegroundColor Cyan
Write-Host ''

Write-Host '1. Teacher Model Google Fields:' -ForegroundColor Yellow
$teacher = Get-Content 'C:/Users/Dell/Desktop/Project/Studiesmasters-backend/models/teacher.js' -Raw
if ($teacher -match 'googleMeetEmail') { Write-Host '   [+] googleMeetEmail exists' }
if ($teacher -match 'googleAccountVerified') { Write-Host '   [+] googleAccountVerified exists' }
if ($teacher -match 'googleVerifiedAt') { Write-Host '   [+] googleVerifiedAt exists' }
if ($teacher -match 'googleOAuthState') { Write-Host '   [+] googleOAuthState exists' }

Write-Host ''
Write-Host '2. ClassSession Model Google Fields:' -ForegroundColor Yellow
$session = Get-Content 'C:/Users/Dell/Desktop/Project/Studiesmasters-backend/models/ClassSession.js' -Raw
if ($session -match 'coHostStatus') { Write-Host '   [+] coHostStatus exists' }
if ($session -match 'googleMeet') { Write-Host '   [+] googleMeet object exists' }

Write-Host ''
Write-Host '3. Teacher OAuth Service:' -ForegroundColor Yellow
$oauthSvc = Get-Content 'C:/Users/Dell/Desktop/Project/Studiesmasters-backend/services/google/teacher-oauth.service.js' -Raw
if ($oauthSvc -match 'tokeninfo') { Write-Host '   [+] Uses tokeninfo endpoint' }
if ($oauthSvc -match 'google-auth-library') { Write-Host '   [-] google-auth-library NOT used (needs upgrade)' -ForegroundColor Red }

Write-Host ''
Write-Host '4. Google Account Audit Log Model:' -ForegroundColor Yellow
if (Test-Path 'C:/Users/Dell/Desktop/Project/Studiesmasters-backend/models/GoogleAccountAuditLog.js') { 
    Write-Host '   [+] Audit log model exists' 
} else { 
    Write-Host '   [-] Audit log model MISSING (needs creation)' -ForegroundColor Red 
}

Write-Host ''
Write-Host '5. Scheduling Service Handling:' -ForegroundColor Yellow
$sched = Get-Content 'C:/Users/Dell/Desktop/Project/Studiesmasters-backend/services/qao/scheduling.service.js' -Raw
if ($sched -match 'teacherGoogleEmail') { Write-Host '   [+] Uses teacherGoogleEmail' }
if ($sched -match 'manual_required') { Write-Host '   [+] Handles manual_required status' }

Write-Host ''
Write-Host '6. Teacher Join Endpoint:' -ForegroundColor Yellow
$meetRoutes = Get-Content 'C:/Users/Dell/Desktop/Project/Studiesmasters-backend/routes/meetRoutes.js' -Raw
if ($meetRoutes -match '/teacher/:sessionId/join') { Write-Host '   [+] Teacher join endpoint exists' }

Write-Host ''
Write-Host '=== REVIEW COMPLETE ===' -ForegroundColor Cyan