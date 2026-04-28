const fs = require('fs');
const path = 'frontend/src/app/dashboard/staff/unit-requisition/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = /\{item\.status === 'searching' && \(<span className=" text-\[10px\] font-black text-blue-500 uppercase animate-pulse\\>Searching\.\.\.<\/span>\)\} \{item\.productName && \(/;

const replacement = `{item.status === 'searching' && (
                                        <span className="text-[10px] font-black text-blue-500 uppercase animate-pulse">
                                          Searching...
                                        </span>
                                      )}
                                      {item.productName && (`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log('Fixed successfully');
