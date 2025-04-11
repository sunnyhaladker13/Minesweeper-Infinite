# Minesweeper Infinite

A modern take on the classic Minesweeper game, featuring 10 progressively difficult levels, responsive design, and a global leaderboard powered by Google Sheets.

## Features

- Classic Minesweeper gameplay with a progressive level system
- Three grid size options: 20x20, 50x50, and 100x100
- Mobile-friendly controls with Flag Mode toggle
- Neobrutalist visual design
- Global leaderboard system using Google Sheets

## How to Play

1. Select a grid size to start the game
2. Click to reveal cells
3. Right-click (or use Flag Mode on mobile) to place flags on suspected mines
4. Complete all 10 levels to win
5. Submit your score to the global leaderboard

## Google Sheets Leaderboard Setup Instructions

Follow these steps to set up the Google Sheets leaderboard for your Minesweeper Infinite game:

### Step 1: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Rename the spreadsheet to "Minesweeper Infinite Leaderboard"
3. Set up the following column headers in row 1:
   - A1: Timestamp
   - B1: Name
   - C1: GridSize
   - D1: Level
   - E1: TotalTime
   - F1: Completed

### Step 2: Create Google Apps Script

1. In your Google Sheet, click on "Extensions" > "Apps Script"
2. Delete any code in the editor and paste the following:

```javascript
// Google Apps Script code for Minesweeper Infinite Leaderboard

function doGet(request) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = getLeaderboardData(sheet);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      leaderboard: data
    }))
    .setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: e.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(request) {
  try {
    var data = JSON.parse(request.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Validate the data
    if (!data.name || data.name.length > 3 || !data.gridSize || !data.level) {
      throw new Error('Invalid data format');
    }
    
    // Add new score to sheet
    sheet.appendRow([
      new Date(), // Timestamp
      data.name,
      data.gridSize,
      data.level,
      data.totalTime,
      data.completed ? 'TRUE' : 'FALSE'
    ]);
    
    // Return updated leaderboard
    var leaderboardData = getLeaderboardData(sheet);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      leaderboard: leaderboardData
    }))
    .setMimeType(ContentService.MimeType.JSON);
    
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: e.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

function getLeaderboardData(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // Only header row exists
  
  // Get all data except header row
  var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  
  // Transform into objects
  var leaderboard = data.map(function(row) {
    return {
      timestamp: row[0],
      name: row[1],
      gridSize: row[2],
      level: row[3],
      totalTime: row[4],
      completed: row[5] === true || row[5] === 'TRUE'
    };
  });
  
  return leaderboard;
}
```

3. Save the project with a name like "MinesweeperLeaderboard"

### Step 3: Deploy the Web App

1. Click on "Deploy" > "New deployment"
2. Select "Web app" as the deployment type
3. Fill in the following settings:
   - Description: "Minesweeper Infinite Leaderboard API"
   - Execute as: "Me (your email)"
   - Who has access: "Anyone"
4. Click "Deploy"
5. Copy the Web App URL provided (it will look something like `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`)

### Step 4: Configure Your Game

1. Open the `script.js` file in your Minesweeper Infinite game
2. Find the line with `const LEADERBOARD_API_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';`
3. Replace `YOUR_SCRIPT_ID` with the ID portion from the URL you copied in Step 3

### Step 5: Test Your Integration

1. Open your game in a web browser
2. Complete a game or intentionally hit a mine
3. Enter your 3-character name and submit your score
4. Check your Google Sheet to verify the score was recorded
5. Refresh your game to see if the leaderboard displays correctly

## CORS Considerations

If you encounter CORS (Cross-Origin Resource Sharing) issues when testing locally:
1. For testing, you might need to use browser extensions that disable CORS restrictions
2. When deploying to production, ensure your hosting domain is properly configured

## Customization

- You can modify the styling in `style.css` to change the visual appearance
- Adjust difficulty levels in the `startLevel()` function in `script.js`
- Change the number of levels by modifying the level check in `endGame()`