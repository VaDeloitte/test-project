#!/usr/bin/env pwsh
# Test script for Data Lifecycle Management endpoints

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Data Lifecycle Management - Endpoint Tests" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BASE_URL = "http://localhost:3000"
$API_KEY = "MzM1ODllMGMtMDJmNS00OTE0LWE2M2UtNDg0MDhkZGRjYzRi"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Base URL: $BASE_URL" -ForegroundColor White
Write-Host "  API Key: $($API_KEY.Substring(0,20))..." -ForegroundColor White
Write-Host ""

# Check if server is running
Write-Host "Checking if Next.js dev server is running..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-Host "✓ Server is running!" -ForegroundColor Green
} catch {
    Write-Host "✗ Server is not running!" -ForegroundColor Red
    Write-Host "  Please start the dev server with: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test 1: Create a Test Group" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

$groupPayload = @{
    groupName = "Test Cleanup Group"
    description = "Testing data lifecycle management"
    createdBy = "test@example.com"
    createdByAzureId = "test-azure-id-123"
    space_lifetime = 1
    members = @()
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/secure-groups" -Method POST -Body $groupPayload -ContentType "application/json"
    Write-Host "✓ Group created successfully!" -ForegroundColor Green
    Write-Host "  Group ID: $($response.group.groupId)" -ForegroundColor White
    Write-Host "  Expires At: $($response.group.expiresAt)" -ForegroundColor White
    $groupId = $response.group.groupId
} catch {
    Write-Host "✗ Failed to create group" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test 2: Upload a Test Resource" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

$resourcePayload = @{
    fileName = "test-document.pdf"
    filePath = "/test/path/document.pdf"
    fileSize = 1024000
    fileType = "application/pdf"
    uploadType = "personal_chat"
    uploadedBy = "test@example.com"
    uploadedByAzureId = "test-azure-id-123"
    conversationId = "test-conv-123"
    metadata = @{
        testFile = $true
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/secure-resources/upload" -Method POST -Body $resourcePayload -ContentType "application/json"
    Write-Host "✓ Resource uploaded successfully!" -ForegroundColor Green
    Write-Host "  Resource ID: $($response.resource.resourceId)" -ForegroundColor White
    Write-Host "  Upload Type: $($response.resource.uploadType)" -ForegroundColor White
} catch {
    Write-Host "✗ Failed to upload resource" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test 3: Test Group Cleanup Endpoint" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

$headers = @{
    "x-cleanup-api-key" = $API_KEY
}

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/cleanup/groups" -Method POST -Headers $headers
    Write-Host "✓ Group cleanup executed successfully!" -ForegroundColor Green
    Write-Host "  Batch ID: $($response.batchId)" -ForegroundColor White
    Write-Host "  Expired Groups: $($response.stats.expiredGroups)" -ForegroundColor White
    Write-Host "  Hard Deleted Groups: $($response.stats.hardDeletedGroups)" -ForegroundColor White
    Write-Host "  Deleted Resources: $($response.stats.deletedResources)" -ForegroundColor White
    Write-Host "  Deleted Conversations: $($response.stats.deletedConversations)" -ForegroundColor White
} catch {
    Write-Host "✗ Cleanup failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test 4: Test Resource Cleanup Endpoint" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/cleanup/resources" -Method POST -Headers $headers
    Write-Host "✓ Resource cleanup executed successfully!" -ForegroundColor Green
    Write-Host "  Batch ID: $($response.batchId)" -ForegroundColor White
    Write-Host "  Soft Deleted Resources: $($response.stats.softDeletedResources)" -ForegroundColor White
    Write-Host "  Hard Deleted Resources: $($response.stats.hardDeletedResources)" -ForegroundColor White
} catch {
    Write-Host "✗ Cleanup failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test 5: Test Conversation Cleanup Endpoint" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/cleanup/conversations" -Method POST -Headers $headers
    Write-Host "✓ Conversation cleanup executed successfully!" -ForegroundColor Green
    Write-Host "  Batch ID: $($response.batchId)" -ForegroundColor White
    Write-Host "  Soft Deleted: $($response.stats.softDeletedConversations)" -ForegroundColor White
    Write-Host "  Hard Deleted: $($response.stats.hardDeletedConversations)" -ForegroundColor White
} catch {
    Write-Host "✗ Cleanup failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test 6: Test User Cleanup Endpoint" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/cleanup/users" -Method POST -Headers $headers
    Write-Host "✓ User cleanup executed successfully!" -ForegroundColor Green
    Write-Host "  Batch ID: $($response.batchId)" -ForegroundColor White
    Write-Host "  Marked Inactive: $($response.stats.markedInactive)" -ForegroundColor White
    Write-Host "  Hard Deleted Users: $($response.stats.hardDeletedUsers)" -ForegroundColor White
} catch {
    Write-Host "✗ Cleanup failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test 7: Test Mark Inactive Endpoint" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/secure-users/mark-inactive" -Method POST -Headers $headers
    Write-Host "✓ Mark inactive executed successfully!" -ForegroundColor Green
    Write-Host "  Batch ID: $($response.batchId)" -ForegroundColor White
    Write-Host "  Users Marked Inactive: $($response.data.modifiedCount)" -ForegroundColor White
} catch {
    Write-Host "✗ Mark inactive failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "All Tests Completed!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check MongoDB for audit logs:" -ForegroundColor White
Write-Host "   db.Secure_audit_logs.find().sort({timestamp:-1}).limit(10)" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Verify created test data:" -ForegroundColor White
Write-Host "   db.Secure_groups.find({groupName:'Test Cleanup Group'})" -ForegroundColor Cyan
Write-Host "   db.Secure_resources.find({fileName:'test-document.pdf'})" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Review full documentation:" -ForegroundColor White
Write-Host "   - NEXT_STEPS.md" -ForegroundColor Cyan
Write-Host "   - COMMAND_REFERENCE.md" -ForegroundColor Cyan
Write-Host "   - DATA_LIFECYCLE.md" -ForegroundColor Cyan
Write-Host ""
