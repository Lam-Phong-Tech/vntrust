const Client = require('ssh2-sftp-client');
const sftp = new Client();

const config = {
  host: '45.119.83.233',
  port: 22,
  username: 'root',
  password: 'Tailoc@2026'
};

async function upload() {
  try {
    console.log('Connecting to SFTP...');
    await sftp.connect(config);
    console.log('Connected! Uploading file...');
    await sftp.fastPut('d:\\Web hang gia\\vntrust_deploy.tar.gz', '/tmp/vntrust_deploy.tar.gz');
    console.log('Upload vntrust_deploy.tar.gz success!');
    await sftp.fastPut('d:\\Web hang gia\\setup_vntrust.sh', '/tmp/setup_vntrust.sh');
    console.log('Upload setup_vntrust.sh success!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    sftp.end();
  }
}

upload();
