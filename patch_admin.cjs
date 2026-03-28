const fs = require('fs');
const file = 'frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('LogOut')) {
  // Add LogOut and LayoutDashboard
  content = content.replace(/import \{ Clock/, 'import { Clock, LogOut, LayoutDashboard, Settings2, BarChart3, Activity');
}

// 1. Replace the outer wrapper
const replaceStart = '<div className=\"min-h-screen bg-[#F8F9FB] pt-24 pb-12\">';
const replaceWith = `<div className=\"flex h-screen bg-[#F8F9FB] font-sans overflow-hidden\">
      {/* ── SIDEBAR ── */}
      <aside className=\"w-72 bg-[#0f172a] text-white flex flex-col justify-between shrink-0 shadow-2xl relative z-40\">
        <div className=\"p-8 flex-1 overflow-y-auto hidden-scrollbar\">
          {/* Logo */}
          <div className=\"flex items-center gap-3 mb-12 group cursor-pointer\" onClick={() => setActiveTab('overview')}>
            <div className=\"w-10 h-10 bg-orange-500 rounded-[14px] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform\">
              <ShieldCheck size={20} strokeWidth={3} />
            </div>
            <div className=\"flex flex-col\">
              <h1 className=\"text-xl font-black tracking-tighter uppercase leading-none\">FOODIE</h1>
              <span className=\"text-[9px] font-black tracking-[0.3em] text-orange-400 uppercase\">ADMIN HUB</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className=\"space-y-1.5\">
            {[
              { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
              { id: 'live', icon: Activity, label: 'Live Feed' },
              { id: 'gps', icon: MapPin, label: 'Fleet Map' },
              { id: 'intelligence', icon: BarChart3, label: 'Analytics' },
              { id: 'orders', icon: ShoppingCart, label: 'All Orders' },
              { id: 'restaurants', icon: Store, label: 'Restaurants' },
              { id: 'users', icon: Users, label: 'Users & Staff' },
              { id: 'finance', label: 'Finance', icon: DollarSign },
              { id: 'approvals', label: 'Approvals', icon: CheckCircle },
              { id: 'support', label: 'Support Desk', icon: Bell },
              { id: 'settings', label: 'Settings', icon: Settings2 }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={\`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all \${
                    isActive 
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-inner' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }\`}
                >
                  <div className=\"flex items-center gap-4\">
                    {tab.icon && <tab.icon size={16} className={isActive ? 'text-orange-400' : 'opacity-70'} />}
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className=\"p-8 border-t border-white/10 space-y-4 shrink-0\">
          <button onClick={() => { logout(); window.location.href = '/admin/login'; }} className=\"flex items-center gap-3 text-rose-400/80 font-bold hover:text-rose-400 text-sm transition-colors w-full px-5 py-3\">
            <LogOut size={16} /> Close Session
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className=\"flex-1 flex flex-col overflow-y-auto w-full relative bg-[#F4F6F9]\">`;

content = content.replace(replaceStart, replaceWith);

// 2. We need to remove the horizontal tabs container
// It looks like:
//         {/* Main Tabs */}
//         <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
//           <div className="flex border-b border-slate-50 p-3 gap-3 bg-slate-50/50 overflow-x-auto no-scrollbar">
// ...
//           <div className="p-8 md:p-12">
const tabsRegex = /\{\/\*\s*Main Tabs\s*\*\/\}[\\s\\S]*?<div className=\"p-8 md:p-12\">/;
content = content.replace(tabsRegex, '<div className=\"p-8 md:p-12\">');

// 3. Close the main tag at the very end. The file currently ends with:
//         </div>
//       </div>
//     </div>
//   );
// }
// We replaced the outermost div with div > flex > aside + main. 
// So the end just replacing the last 3 divs with `</main> </div>`
const endRegex = /<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}\s*$/;
content = content.replace(endRegex, '</div>\n      </main>\n    </div>\n  );\n}\n');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully injected Admin Panel sidebar and fixed wrapper!');
