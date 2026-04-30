export default {
  async fetch(request, env, ctx) {
    const PHONE_NUMBER = env.PHONE_NUMBER;
    const BARK_URL = env.BARK_URL;
    const PUSHPLUS_TOKEN = env.PUSHPLUS_TOKEN;

    // 异步发送通知，不阻塞重定向响应
    ctx.waitUntil(sendNotifications(BARK_URL, PUSHPLUS_TOKEN));

    // 返回 302 重定向到拨号协议
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `tel:${PHONE_NUMBER}`,
        'Cache-Control': 'no-cache'
      }
    });
  }
};

async function sendNotifications(barkUrl, pushplusToken) {
  const promises = [];

  // Bark 通知
  if (barkUrl) {
    promises.push(
      fetch(barkUrl).catch(err => console.error('Bark Error:', err))
    );
  }

  // Pushplus 通知
  if (pushplusToken) {
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
