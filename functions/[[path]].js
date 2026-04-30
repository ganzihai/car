export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const { PHONE_NUMBER, BARK_URL, PUSHPLUS_TOKEN } = env;

  const url = new URL(request.url);
  
  // 处理根路径，显示图片
  if (url.pathname === '/' || url.pathname === '') {
    const rootHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>挪车服务</title>
      <style>
        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #000; }
        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
      </style>
    </head>
    <body>
      <img src="https://img.zznuo.com/2026/01/%E4%B8%80%E9%94%AE%E6%8C%AA%E8%BD%A6.jpg" alt="挪车码">
    </body>
    </html>
    `;
    return new Response(rootHtml, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  }

  // 只有路径为 /move 时才触发通知和拨号
  if (url.pathname !== '/move' && url.pathname !== '/move/') {
    return new Response('Not Found', { status: 404 });
  }

  if (!PHONE_NUMBER || PHONE_NUMBER === 'PLACEHOLDER') {
    return new Response('Config Error', { status: 500 });
  }

  // 1. 静默触发通知
  waitUntil(sendNotifications(BARK_URL, PUSHPLUS_TOKEN));

  const ua = request.headers.get('user-agent') || '';
  const isWechat = /MicroMessenger/i.test(ua);

  const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>自助挪车服务</title>
    <style>
      body { font-family: -apple-system, sans-serif; background-color: #f7f7f7; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { background: white; width: 85%; max-width: 400px; padding: 40px 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; }
      .icon { width: 64px; height: 64px; background: #07c160; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; }
      h2 { margin: 0 0 10px; color: #333; font-size: 20px; }
      p { color: #888; font-size: 14px; margin-bottom: 30px; line-height: 1.6; }
      .btn { display: block; background: #07c160; color: white; text-decoration: none; padding: 12px; border-radius: 6px; font-weight: 500; font-size: 16px; }
      .footer { margin-top: 20px; font-size: 12px; color: #ccc; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✓</div>
      <h2>通知已发送</h2>
      <p>车主已收到挪车请求<br>正在赶往现场，请稍候...</p>
      <a href="tel:${PHONE_NUMBER}" class="btn">立即拨打电话</a>
      <div class="footer">由交管12123挪车助手 提供支持</div>
    </div>
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.location.href = "tel:${PHONE_NUMBER}";
        }, ${isWechat ? 800 : 100});
      };
    </script>
  </body>
  </html>
  `;

  return new Response(html, { 
    headers: { 
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    } 
  });
}

async function sendNotifications(barkUrl, pushplusToken) {
  const promises = [];
  if (barkUrl && barkUrl !== 'PLACEHOLDER') {
    promises.push(fetch(encodeURI(barkUrl)).catch(() => {}));
  }
  if (pushplusToken && pushplusToken !== 'PLACEHOLDER') {
    promises.push(fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: pushplusToken,
        title: '有人扫描了您的挪车码',
        content: '扫描者已进入拨号页面，请留意电话。',
        channel: 'wechat'
      })
    }).catch(() => {}));
  }
  await Promise.all(promises);
}
