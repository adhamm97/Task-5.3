const fs = require('fs');
const path = require('path');

// Use an already-installed local mongod on Windows if present so `npm test`
// does not time out downloading the ~780 MB archive on slow connections.
if (!process.env.MONGOMS_SYSTEM_BINARY && process.platform === 'win32') {
  const baseDir = 'C:\\Program Files\\MongoDB\\Server';
  if (fs.existsSync(baseDir)) {
    const versions = fs.readdirSync(baseDir).sort().reverse();
    for (const ver of versions) {
      const candidate = path.join(baseDir, ver, 'bin', 'mongod.exe');
      if (fs.existsSync(candidate)) {
        process.env.MONGOMS_SYSTEM_BINARY = candidate;
        break;
      }
    }
  }
}

