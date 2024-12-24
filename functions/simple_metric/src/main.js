import { Client, Users } from 'node-appwrite';

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
  // You can use the Appwrite SDK to interact with other services
  // For this example, we're using the Users service
  // const client = new Client()
  //   .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
  //   .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
  //   .setKey(req.headers['x-appwrite-key'] ?? '');
  // const users = new Users(client);

  // try {
  //   const response = await users.list();
  //   // Log messages and errors to the Appwrite Console
  //   // These logs won't be seen by your end users
  //   log(`Total users: ${response.total}`);
  // } catch(err) {
  //   error("Could not list users: " + err.message);
  // }

  // The req object contains the request data
  if (req.path === "/metrics") {
    // Use res object to respond with text(), json(), or binary()
    // Don't forget to return a response!

    // use random 1~100 to mock metric value
    const max = 100;
    const min = 1;
    const value = Math.floor(Math.random() * (max - min + 1) + min);
    // https://appwrite.io/threads/1276400064436240384 
    // res.text is not a function
    return res.send(`
# HELP simple_gauge_metric Description of simple_gauge_metric
# TYPE simple_gauge_metric gauge
simple_gauge_metric{label="simple"} ${value}
    `, 200, { "content-type": "text/html" });
  };
  console.info(req, res)
  return res.send("OK");
}
