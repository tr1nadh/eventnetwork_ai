import fetch from 'node-fetch';

async function test() {
  // Use http://localhost:5173/api/events?q=delhi
  try {
    const res = await fetch('http://localhost:5173/api/events?q=delhi', {
      headers: {
        // I don't have the auth cookie, so this will fail with 401. 
      }
    });
    console.log(res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
