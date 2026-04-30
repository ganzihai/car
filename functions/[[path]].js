export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const { PHONE_NUMBER, BARK_URL, PUSHPLUS_TOKEN } = env;

  // 诊断模式：检查变量是否配置
  if (!PHONE_NUMBER || PHONE_NUMBER === 'PLACEHOLDER') {
    return new Response('错误：环境变量 PHONE_NUMBER 未配置！请在 Cloudflare Pages 控制台的 Settings -> Functions -> Environment variables 中设置。', {
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    });
  }

  // 异步发送通知
  waitUntil(sendNotifications(BARK_URL, PUSHPLUS_TOKEN));

  // 返回 HTML 页面和重定向建议
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>正在通知车主...</title>
    <style>
      body { font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f4f4f9; color: #333; }
      .container { padding: 20px; }
      .btn { display: inline-block; padding: 15px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 1.2rem; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .loading { font-size: 1rem; color: #666; margin-top: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>通知已发送给车主</h2>
      <p class="loading">正在为您呼叫车主，请稍候...</p>
      <a href="tel:${PHONE_NUMBER}" class="btn">手动拨打电话</a>
    </div>
    <script>
      // 尝试自动弹出拨号界面
      window.location.href = "tel:${PHONE_NUMBER}";
    </script>
  </body>
  </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8'
    }
  });
}

async function sendNotifications(barkUrl, pushplusToken) {
  const promises = [];

  // Bark 通知
  if (barkUrl && barkUrl !== 'PLACEHOLDER') {
    const encodedUrl = encodeURI(barkUrl);
    promises.push(
      fetch(encodedUrl).catch(err => console.error('Bark Error:', err))
    );
  }

  // Pushplus 通知
  if (pushplusToken && pushplusToken !== 'PLACEHOLDER') {
    promises.push(
      fetch('https://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: pushplusToken,
          title: '挪车通知',
          content: '有人扫码找你挪车啦，请尽快处理！',
          channel: 'wechat'
        })
      }).catch(err => console.error('Pushplus Error:', err))
    );
  }

  await Promise.all(promises);
}
