import React from 'react'

function Layout() {
  return (
    <>
    <div className="gpt-layout">
        <aside className="gpt-sidebar">
            <div className="sidebar-top">
                <button className="new-chat">＋ New chat</button>
            </div>
            <nav className="chat-list">
                <button className="chat-item active">Example chat</button>
                <button className="chat-item">Ideas</button>
                <button className="chat-item">Notes</button>
            </nav>
            <div className="sidebar-footer">GPT Clone • Local UI</div>
        </aside>

        <main className="gpt-main">
            <header className="gpt-header">
                <div className="title">GPT-like UI</div>
                <div className="header-actions">
                    <button className="model-btn">Model: gpt</button>
                </div>
            </header>

            <section className="messages" aria-live="polite">
                <div className="message assistant">
                    <div className="avatar">🤖</div>
                    <div className="bubble">
                        Hello — this is a GPT-like interface mockup. Type below to start a conversation.
                    </div>
                </div>

                <div className="message user">
                    <div className="avatar">🙂</div>
                    <div className="bubble">Show me a short example of a React component.</div>
                </div>

                <div className="message assistant">
                    <div className="avatar">🤖</div>
                    <div className="bubble">
                        Here's a simple stateless React component example:
                        <pre className="code">const Hello = () =&gt; &lt;div&gt;Hello&lt;/div&gt;;</pre>
                    </div>
                </div>
            </section>

            <form className="composer" onSubmit={(e) => e.preventDefault()}>
                <textarea
                    className="input"
                    placeholder="Send a message..."
                    rows="1"
                    aria-label="Message input"
                />
                <div className="composer-actions">
                    <button type="button" className="action">＋</button>
                    <button type="submit" className="send">Send</button>
                </div>
            </form>
        </main>

        <style>{`
            .gpt-layout { display: flex; height: 86vh; font-family: Inter, system-ui, Helvetica, Arial; color: #e6edf3; background: #0b1020; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 30px rgba(2,6,23,0.6); }
            .gpt-sidebar { width: 240px; background: linear-gradient(180deg,#0f1724,#071026); padding: 16px; display:flex; flex-direction:column; gap:12px; }
            .sidebar-top { display:flex; }
            .new-chat { width:100%; padding:10px; background:#111827; color:#e6edf3; border: none; border-radius:8px; cursor:pointer; }
            .chat-list { display:flex; flex-direction:column; gap:8px; margin-top:8px; overflow:auto; }
            .chat-item { text-align:left; padding:10px; background:transparent; color:#cbd5e1; border-radius:6px; border:none; cursor:pointer; }
            .chat-item:hover { background: rgba(255,255,255,0.03); }
            .chat-item.active { background: rgba(99,102,241,0.12); color:#e6edf3; }
            .sidebar-footer { margin-top:auto; font-size:12px; color:#94a3b8; }

            .gpt-main { flex:1; display:flex; flex-direction:column; }
            .gpt-header { display:flex; justify-content:space-between; align-items:center; padding:16px 18px; background:linear-gradient(180deg, rgba(255,255,255,0.02), transparent); border-bottom:1px solid rgba(255,255,255,0.03); }
            .title { font-weight:600; color:#f8fafc; }
            .model-btn { background:#0b1220; color:#9fb0d9; border:1px solid rgba(255,255,255,0.04); padding:8px 10px; border-radius:8px; }

            .messages { padding:20px; display:flex; flex-direction:column; gap:12px; overflow:auto; flex:1; background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent); }
            .message { display:flex; gap:12px; align-items:flex-start; max-width:900px; }
            .message .avatar { width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:rgba(255,255,255,0.03); color:#dbeafe; font-size:18px; flex-shrink:0; }
            .bubble { padding:12px 14px; border-radius:10px; background:rgba(255,255,255,0.02); color:#dbeafe; line-height:1.4; }
            .message.user { justify-content:flex-end; align-items:flex-end; flex-direction:row-reverse; }
            .message.user .bubble { background:linear-gradient(180deg,#0f1724,#0b1220); color:#e6edf3; }
            .message .code { margin:8px 0 0; padding:8px; background:rgba(0,0,0,0.25); border-radius:6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace; font-size:12px; color:#cbd5e1; overflow:auto; }

            .composer { display:flex; gap:12px; padding:12px 16px; border-top:1px solid rgba(255,255,255,0.02); align-items:center; background: linear-gradient(180deg, transparent, rgba(255,255,255,0.01)); }
            .input { flex:1; resize:none; padding:10px 12px; border-radius:10px; background:rgba(5,8,15,0.6); border:1px solid rgba(255,255,255,0.03); color:#e6edf3; outline:none; }
            .composer-actions { display:flex; gap:8px; }
            .action { background:transparent; border:1px solid rgba(255,255,255,0.04); color:#9fb0d9; padding:8px 10px; border-radius:8px; }
            .send { background:linear-gradient(90deg,#4f46e5,#06b6d4); color:white; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; }

            @media (max-width:800px) {
                .gpt-sidebar { display:none; }
                .gpt-layout { height:100vh; border-radius:0; }
            }
        `}</style>
    </div>
    </>
  )
}

export default Layout
