'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import styles from './page.module.css';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('settings');
  
  // Settings State
  const [settings, setSettings] = useState({ host: '', port: 587, user: '', pass: '', interval: 5 });
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Template State
  const [subject, setSubject] = useState('');
  const [htmlTemplate, setHtmlTemplate] = useState('<h1>Hello {name}</h1><p>This is a test email.</p>');
  
  // Blast State
  const [users, setUsers] = useState([]);
  const [blasting, setBlasting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Manual Entry State
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Search State
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  
  // Logs State
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setSettings({ host: data.host, port: data.port, user: data.user, pass: data.pass, interval: data.interval });
          if (data.subject) setSubject(data.subject);
          if (data.htmlTemplate) setHtmlTemplate(data.htmlTemplate);
        }
      } else {
        const err = await res.json();
        console.error('Failed to load settings:', err);
        alert('Failed to load settings: ' + err.error);
      }
    } catch (e) {
      console.error('Fetch settings error:', e);
    }
  };

  const fetchLogs = async () => {
    const res = await fetch('/api/logs');
    if (res.ok) {
      const data = await res.json();
      setLogs(data);
    }
  };

  const exportLogs = () => {
    if (logs.length === 0) return alert('No logs to export.');
    
    const ws = XLSX.utils.json_to_sheet(logs.map(log => ({
      Email: log.email,
      Status: log.status,
      Message: log.message,
      Date: new Date(log.timestamp).toLocaleString()
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");
    
    XLSX.writeFile(wb, `PostmanPro_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to delete all logs? This cannot be undone.')) return;
    
    const res = await fetch('/api/logs', { method: 'DELETE' });
    if (res.ok) {
      setLogs([]);
    } else {
      alert('Failed to clear logs.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleSaveSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, subject, htmlTemplate }),
      });
      setSavingSettings(false);
      if (!res.ok) {
        const err = await res.json();
        alert('Failed to save settings: ' + err.error);
      } else {
        alert('Settings saved!');
      }
    } catch (e) {
      setSavingSettings(false);
      alert('Network error while saving settings: ' + e.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      const parsedUsers = [];
      // Assuming first row is header, look for 'name' and 'email' (case insensitive)
      let nameIdx = -1;
      let emailIdx = -1;
      
      if (data.length > 0) {
        const headers = data[0].map(h => String(h).toLowerCase());
        nameIdx = headers.findIndex(h => h.includes('name'));
        emailIdx = headers.findIndex(h => h.includes('email'));
        
        if (nameIdx === -1) nameIdx = 0; // fallback to column 1
        if (emailIdx === -1) emailIdx = 1; // fallback to column 2

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[emailIdx]) {
            parsedUsers.push({
              name: row[nameIdx] || 'User',
              email: row[emailIdx],
              status: 'Pending'
            });
          }
        }
      }
      setUsers(parsedUsers);
    };
    reader.readAsBinaryString(file);
  };

  const handleAddManualUser = (e) => {
    e.preventDefault();
    if (!manualEmail) return alert("Email is required");
    setUsers([...users, { name: manualName || 'User', email: manualEmail, status: 'Pending' }]);
    setManualName('');
    setManualEmail('');
    setShowManualEntry(false);
  };

  const startBlast = async () => {
    if (users.length === 0) return alert('Please add at least one user to the list.');
    if (!subject) return alert('Enter a subject.');
    
    setBlasting(true);
    setProgress(0);
    
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const intervalMs = (settings.interval || 5) * 1000;

    let localUsers = [...users];

    for (let i = 0; i < localUsers.length; i++) {
      const user = localUsers[i];
      if (user.status === 'Sent') continue;

      const personalizedHtml = htmlTemplate.replace(/{name}/gi, user.name);

      localUsers[i].status = 'Sending...';
      setUsers([...localUsers]);

      try {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            subject: subject.replace(/{name}/gi, user.name),
            html: personalizedHtml
          }),
        });

        if (res.ok) {
          localUsers[i].status = 'Sent';
        } else {
          localUsers[i].status = 'Failed';
        }
      } catch (e) {
        localUsers[i].status = 'Failed';
      }

      setUsers([...localUsers]);
      setProgress(i + 1);

      if (i < localUsers.length - 1) {
        await delay(intervalMs);
      }
    }

    setBlasting(false);
    alert('Blast completed!');
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.status.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredLogs = logs.filter(log => 
    log.email.toLowerCase().includes(logSearch.toLowerCase()) || 
    log.status.toLowerCase().includes(logSearch.toLowerCase()) ||
    (log.message && log.message.toLowerCase().includes(logSearch.toLowerCase()))
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>Postman Pro</div>
        <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
      </header>

      <div className={styles.tabs}>
        <button className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
        <button className={`${styles.tabBtn} ${activeTab === 'template' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('template')}>Template</button>
        <button className={`${styles.tabBtn} ${activeTab === 'blast' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('blast')}>Blast Email</button>
        <button className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('logs')}>Logs</button>
      </div>

      <main className="glass-panel">
        {activeTab === 'settings' && (
          <div className={styles.tabContent}>
            <h2>SMTP Configuration</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>Configure your SMTP server settings to send emails.</p>
            
            <form onSubmit={handleSaveSettings} style={{maxWidth: '500px'}}>
              <div className="form-group">
                <label>SMTP Host</label>
                <input type="text" className="form-control" value={settings.host || ''} onChange={e => setSettings({...settings, host: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>SMTP Port</label>
                <input type="number" className="form-control" value={settings.port || ''} onChange={e => setSettings({...settings, port: parseInt(e.target.value, 10)})} required />
              </div>
              <div className="form-group">
                <label>SMTP User (Email)</label>
                <input type="email" className="form-control" value={settings.user || ''} onChange={e => setSettings({...settings, user: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>SMTP Password</label>
                <input type="password" className="form-control" value={settings.pass || ''} onChange={e => setSettings({...settings, pass: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Interval Between Emails (Seconds)</label>
                <input type="number" className="form-control" value={settings.interval || ''} onChange={e => setSettings({...settings, interval: parseInt(e.target.value, 10)})} required min="1" />
              </div>
              <button type="submit" className="btn-primary" disabled={savingSettings}>
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'template' && (
          <div className={styles.tabContent}>
            <div className={styles.grid2}>
              <div>
                <h2>Email Template</h2>
                <p style={{color: 'var(--text-muted)', marginBottom: '1rem'}}>Use {'{name}'} to inject the user's name.</p>
                <div className="form-group">
                  <label>Subject</label>
                  <input type="text" className="form-control" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Welcome, {name}!" />
                </div>
                <div className="form-group">
                  <label>HTML Content</label>
                  <textarea className="form-control" rows="15" value={htmlTemplate} onChange={e => setHtmlTemplate(e.target.value)}></textarea>
                </div>
              </div>
              <div>
                <h2>Live Preview</h2>
                <p style={{color: 'var(--text-muted)', marginBottom: '1rem'}}>Preview your HTML email.</p>
                <div className={styles.previewPane} dangerouslySetInnerHTML={{ __html: htmlTemplate.replace(/{name}/gi, 'John Doe') }} />
                
                <button className="btn-primary" style={{marginTop: '1rem', width: '100%'}} onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'blast' && (
          <div className={styles.tabContent}>
            <h2>Blast Emails</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '1rem'}}>Upload an Excel file (.xlsx) or manually add a user.</p>
            
            <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center'}}>
              <input type="file" accept=".xlsx, .xls" className={`form-control ${styles.fileInput}`} onChange={handleFileUpload} disabled={blasting} style={{flex: 1, margin: 0}} />
              <button className="btn-secondary" onClick={() => setShowManualEntry(!showManualEntry)} disabled={blasting} style={{padding: '0.8rem 1.5rem', whiteSpace: 'nowrap'}}>
                {showManualEntry ? 'Cancel Manual Entry' : '+ Add Single User'}
              </button>
            </div>

            {showManualEntry && (
              <form onSubmit={handleAddManualUser} style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', alignItems: 'center'}}>
                <input type="text" className="form-control" placeholder="Name (optional)" value={manualName} onChange={e => setManualName(e.target.value)} disabled={blasting} style={{margin: 0, flex: 1}} />
                <input type="email" className="form-control" placeholder="Email (required)" value={manualEmail} onChange={e => setManualEmail(e.target.value)} disabled={blasting} required style={{margin: 0, flex: 2}} />
                <button type="submit" className="btn-primary" disabled={blasting} style={{margin: 0}}>Add to List</button>
              </form>
            )}
            
            {users.length > 0 && (
              <>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0', flexWrap: 'wrap', gap: '1rem'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <span>{users.length} users loaded.</span>
                    <input type="text" className="form-control" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{margin: 0, width: '250px', padding: '0.4rem 0.8rem'}} />
                  </div>
                  <button className="btn-primary" onClick={startBlast} disabled={blasting || !subject}>
                    {blasting ? 'Blasting...' : 'Start Blast'}
                  </button>
                </div>
                
                {blasting && (
                  <div className={styles.progressContainer}>
                    Sending progress: {progress} / {users.length} (Waiting {settings.interval}s between sends)
                  </div>
                )}
                
                <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u, i) => (
                        <tr key={i}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td className={u.status === 'Sent' ? styles.statusSent : u.status === 'Failed' ? styles.statusFailed : ''}>{u.status}</td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan="3" style={{textAlign: 'center', padding: '2rem'}}>No users found matching "{userSearch}".</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className={styles.tabContent}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <h2 style={{margin: 0}}>Email Logs</h2>
                <input type="text" className="form-control" placeholder="Search logs..." value={logSearch} onChange={e => setLogSearch(e.target.value)} style={{margin: 0, width: '250px', padding: '0.4rem 0.8rem'}} />
              </div>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button className="btn-secondary" onClick={exportLogs} disabled={logs.length === 0}>Export to Excel</button>
                <button className="btn-secondary" style={{color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.5)'}} onClick={clearLogs} disabled={logs.length === 0}>Clear All</button>
                <button className="btn-primary" onClick={fetchLogs}>Refresh</button>
              </div>
            </div>
            
            <div style={{maxHeight: '500px', overflowY: 'auto', marginTop: '1rem'}}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Message</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.email}</td>
                      <td className={log.status === 'Sent' ? styles.statusSent : styles.statusFailed}>{log.status}</td>
                      <td>{log.message}</td>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && logs.length > 0 && (
                    <tr>
                      <td colSpan="4" style={{textAlign: 'center', padding: '2rem'}}>No logs found matching "{logSearch}".</td>
                    </tr>
                  )}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{textAlign: 'center', padding: '2rem'}}>No logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
