import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const userSchema = new mongoose.Schema({ name: String, email: String, password: String, role: String }, { strict: false });
const User = mongoose.model('User', userSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({}).select('name email role password').lean();
  const lines = [];
  lines.push(`Total users: ${users.length}`);

  for (const u of users) {
    const isHashed = u.password && u.password.startsWith('$2');
    let passTest = 'N/A';
    
    const tests = { admin: 'admin123', customer: 'user123', rider: 'rider123', restaurant: 'partner123' };
    if (isHashed && tests[u.role]) {
      passTest = await bcrypt.compare(tests[u.role], u.password) ? 'MATCH' : 'NO_MATCH';
    }
    lines.push(`${u.email} [${u.role}] hashed=${isHashed} testPass=${passTest}`);
  }

  await mongoose.disconnect();
  // Write to file for clean reading
  import('fs').then(({ writeFileSync }) => {
    writeFileSync('user_audit.txt', lines.join('\n'));
    console.log('Written to user_audit.txt');
  });
}

run().catch(e => { console.error(e.message); process.exit(1); });
