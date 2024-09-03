import log from 'loglevel';

class Logger {
  constructor() {
    this.logs = this.loadLogs(); 
    log.setLevel('error'); 
  }

  loadLogs() {
    const storedLogs = localStorage.getItem('logs');
    return storedLogs ? JSON.parse(storedLogs) : [];
  }

  saveLogs() {
    localStorage.setItem('logs', JSON.stringify(this.logs));
  }

  log(level, message) {
    if (log.getLevel() <= log.levels[level.toUpperCase()]) {
      const timestamp = new Date().toLocaleString();
      const logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      this.logs.push(logMessage);
      this.saveLogs(); 

      switch (level) {
        case 'info':
          log.info(logMessage);
          break;
        case 'debug':
          log.debug(logMessage);
          break;
        case 'warn':
          log.warn(logMessage);
          break;
        case 'error':
          log.error(logMessage);
          break;
        default:
          log.info(logMessage);
          break;
      }
    }
  }

  info(message) {
    this.log('info', message);
  }

  debug(message) {
    this.log('debug', message);
  }

  warn(message) {
    this.log('warn', message);
  }

  error(message) {
    this.log('error', message);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('logs');
  }

  downloadLogs() {
    const blob = new Blob([this.logs.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

export default new Logger();
