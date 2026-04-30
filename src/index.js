export default {
  async fetch(request, env, ctx) {
    const { PHONE_NUMBER, BARK_URL, PUSHPLUS_TOKEN } = env;

    // 诊断模式：检查变量是否配置
    if (!PHONE_NUMBER || PHONE_NUMBER === 'PLACEHOLDER') {
      return new Response('错误：环境变量 PHONE_NUMBER 未配置！请在 Cloudflare 控制台设置。', {
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }

    // 异步发送通知
    ctx.waitUntil(sendNotifications(BARK_URL, PUSHPLUS_TOKEN));

    // 返回重定向
    // 同时也返回一个极简的 HTML 确保在重定向失败时可以手动点击
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>正在通知车主...</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding-top: 50px; }
        .btn { display: inline-block; padding: 15px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 1.2rem; }
      </style>
    </head>
    <body>
      <p>通知已发送给车主</p>
      <p>如果手机没有自动弹出拨号界面，请点击下方按钮：</p>
      <a href="tel:${PHONE_NUMBER}" class="btn">拨打电话给车主</a>
      <script>
        // 尝试自动跳转
        window.location.href = "tel:${PHONE_NUMBER}";
      </script>
    </body>
    </html>
    `;

    return new Response(html, {
      status: 200, // 改为 200，用 HTML 内的脚本和 Location 头部双重保障
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Location': `tel:${PHONE_NUMBER}`
      }
    });
  }
};

async function sendNotifications(barkUrl, pushplusToken) {
  const promises = [];

  // Bark 通知 (对包含中文的 URL 进行编码)
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
