const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const localDir = 'src/app/dashboard';
const remoteDir = '/var/www/vntrust/src/app/dashboard';

function getFiles(dir, files_) {
  files_ = files_ || [];
  const files = fs.readdirSync(dir);
  for (const i in files) {
    const name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
}

conn.on('ready', () => {
  console.log('Client ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP connected');
    
    const allFiles = getFiles(localDir);
    let uploaded = 0;
    
    const mkdirp = (remotePath, callback) => {
      const dirs = remotePath.split('/').slice(1);
      let currentPath = '';
      
      const nextDir = () => {
        if (dirs.length === 0) return callback();
        currentPath += '/' + dirs.shift();
        sftp.mkdir(currentPath, (err) => {
          // ignore error since dir might already exist
          nextDir();
        });
      };
      nextDir();
    };
    
    const uploadNext = () => {
      if (uploaded >= allFiles.length) {
        console.log('All files uploaded. Running build on server...');
        conn.exec('cd /var/www/vntrust && npm run build && pm2 restart vntrust', (err, stream) => {
          if (err) throw err;
          stream.on('close', (code, signal) => {
            console.log('Stream closed with code ' + code);
            conn.end();
          }).on('data', (data) => {
            process.stdout.write(data.toString());
          }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
          });
        });
        return;
      }
      
      const file = allFiles[uploaded];
      // Normalize slashes
      const normalizedLocal = file.replace(/\\/g, '/');
      const relativePath = normalizedLocal.substring(localDir.length + 1);
      const remotePath = remoteDir + '/' + relativePath;
      const remoteFileDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
      
      mkdirp(remoteFileDir, () => {
        sftp.fastPut(normalizedLocal, remotePath, (err) => {
          if (err) console.log('Error uploading', normalizedLocal, ':', err);
          else console.log('Uploaded:', normalizedLocal);
          uploaded++;
          uploadNext();
        });
      });
    };
    
    uploadNext();
  });
}).connect({
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
});
