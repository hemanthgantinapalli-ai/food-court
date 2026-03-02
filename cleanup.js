import { execSync } from 'child_process';

console.log('🧹 Freeing up ports 5000 and 5174...');

function freePort(port) {
    try {
        // Find the PID using the port, then kill it
        const result = execSync(
            `netstat -ano | findstr :${port}`,
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        );
        const lines = result.trim().split('\n');
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
                try {
                    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                    console.log(`  ✅ Freed port ${port} (PID ${pid})`);
                } catch (_) { /* process already gone */ }
            }
        }
    } catch (_) {
        // Port not in use — nothing to do
        console.log(`  ℹ️  Port ${port} is already free`);
    }
}

freePort(5000);
freePort(5174);

console.log('✅ Ports cleared. Starting servers...');
