const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadURL('http://localhost:3000');
}

app.whenReady().then(createWindow);

// 新增：监听渲染进程请求打开目录
ipcMain.handle('open-directory-dialog', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    try {
      const fileList = fs.readdirSync(selectedPath).map(name => {
        const fullPath = path.join(selectedPath, name);
        let type = 'file';
        try {
          if (fs.statSync(fullPath).isDirectory()) {
            type = 'directory';
          }
        } catch (e) {
          type = 'unknown';
        }
        return { name, type };
      });
      return { dirPath: selectedPath, files: fileList };
    } catch (err) {
      return { dirPath: selectedPath, files: [], error: '读取目录失败: ' + err.message };
    }
  }
  return { dirPath: '', files: [] };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 新增：排列打开Word文件并移动到主显示器右半边
ipcMain.handle('open-word-arrange', async (event, { filePath }) => {
  const { exec } = require('child_process');
  const os = require('os');
  const fs = require('fs');
  const tmp = os.tmpdir();
  const psPath = tmp + '\\arrange_word_' + Date.now() + '.ps1';
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$null = Start-Process -FilePath "winword.exe" -ArgumentList @("${filePath}")
Start-Sleep -Seconds 2
$wordProc = $null
for ($i=0; $i -lt 10; $i++) {
  $wordProc = Get-Process -Name winword | Sort-Object StartTime -Descending | Select-Object -First 1
  if ($wordProc.MainWindowHandle -ne 0) { break }
  Start-Sleep -Milliseconds 500
}
if ($wordProc -and $wordProc.MainWindowHandle -ne 0) {
  $sig = '[DllImport("user32.dll")]public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);'
  Add-Type -MemberDefinition $sig -Name 'Win32MoveWindow' -Namespace Win32Functions
  $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $x = [math]::Round($screen.Width / 2)
  $y = 0
  $w = [math]::Round($screen.Width / 2)
  $h = $screen.Height
  [Win32Functions.Win32MoveWindow]::MoveWindow($wordProc.MainWindowHandle, $x, $y, $w, $h, $true) | Out-Null
} else {
  Write-Error "Failed to get Word main window handle"
}
`;
  return new Promise((resolve) => {
    fs.writeFileSync(psPath, psScript, { encoding: 'utf8' });
    exec(`powershell -NoProfile -File "${psPath}"`, (error, stdout, stderr) => {
      fs.unlinkSync(psPath);
      if (error) {
        resolve({ error: '打开或排列Word失败: ' + stderr });
      } else {
        resolve({ ok: true });
      }
    });
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
