import React, { useState } from 'react';

function App() {
  const [files, setFiles] = useState([]);
  const [dirPath, setDirPath] = useState('');
  const [error, setError] = useState('');

  const handleBrowseDirectory = async () => {
    let ipcRenderer;
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch (e) {
      setError('Electron ipcRenderer 不可用，无法浏览本地目录。');
      return;
    }
    try {
      const result = await ipcRenderer.invoke('open-directory-dialog');
      if (result.error) {
        setError(result.error);
      } else if (result.dirPath) {
        setDirPath(result.dirPath);
        setFiles(result.files);
        setError('');
      }
    } catch (e) {
      setError('打开目录选择框失败: ' + e.message);
    }
  };

  return (
    <div>
      <h1>Hello World!</h1>
      <p>Welcome to your Electron React application.</p>
      <button onClick={handleBrowseDirectory}>浏览电脑目录</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {dirPath && (
        <div>
          <h3>当前目录: {dirPath}</h3>
          <ul>
            {files.map((file, idx) => (
              <li key={idx}>
                {file.name} {file.type === 'directory' ? <span style={{color: 'blue'}}>[文件夹]</span> : file.type === 'file' ? <span style={{color: 'green'}}>[文件]</span> : <span>[未知]</span>}
                {file.type === 'file' && file.name.toLowerCase().endsWith('.docx') && (
                  <button
                    style={{ marginLeft: 8 }}
                    onClick={async () => {
                      let ipcRenderer;
                      try {
                        ipcRenderer = window.require('electron').ipcRenderer;
                      } catch (e) {
                        setError('Electron ipcRenderer 不可用，无法排列打开Word。');
                        return;
                      }
                      try {
                        const res = await ipcRenderer.invoke('open-word-arrange', {
                          filePath: dirPath + '\\' + file.name
                        });
                        if (res && res.error) {
                          setError(res.error);
                        }
                      } catch (e) {
                        setError('排列打开失败: ' + e.message);
                      }
                    }}
                  >
                    排列打开
                  </button>
                )}
              </li>
            ))}
          </ul>
          <pre style={{background: "#eee", padding: "8px"}}>
            {JSON.stringify(files, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
