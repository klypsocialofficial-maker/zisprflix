import fetch from 'node-fetch';

async function test() {
  try {
     const apiKey = process.env.YOUTUBE_API_KEY || ''; // Let's omit if not in env
     console.log("Checking API", !!apiKey);
  } catch (e) {
     console.error(e);
  }
}
test();
