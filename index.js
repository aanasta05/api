require('dotenv').config();
const express = require('express');
const supabase = require('./supabase');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();


const app = express();
const PORT = 5000;

// Activer CORS pour tout le monde
app.use(cors());

app.use(express.json());

// POST /login - login utilisateur
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    return res.status(401).json({ error: loginError.message });
  }

  // Récupère l'utilisateur à partir de la table 'users'
  const userId = loginData.user.id;
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userDataError) {
    return res.status(500).json({ error: 'Error while fetching user data.' });
  }

  res.json({ session: loginData.session, user: userData });
});

// POST /register - inscription utilisateur
app.post('/register', async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Email, password, and username are required.' });
  }

  // Créer l'utilisateur dans Supabase Auth
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signupError) {
    return res.status(400).json({ error: signupError.message });
  }

  const userId = signupData.user?.id;

  if (!userId) {
    return res.status(500).json({ error: 'User ID not returned from Supabase.' });
  }

  // Insertion dans la table 'users'
  const { data: userData, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        id: userId,
        email,
        username,
        created_at: new Date().toISOString(), // optional si votre table a une valeur par défaut pour timestamp
      },
    ])
    .single();

  if (insertError) {
    return res.status(500).json({ error: 'Error inserting user into users table.' });
  }

  res.status(201).json({ message: 'User registered successfully', user: userData });
});

// GET /data/:uuid - récupérer les événements et les notes d'un utilisateur spécifique
app.get('/data/:uuid', async (req, res) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  // 1. Récupérer les événements pour l'utilisateur
  const { data: events, error: eventsError } = await supabase
    .from('event')
    .select('*')
    .eq('uuid', uuid);

  if (eventsError) {
    return res.status(500).json({ error: 'Error fetching events.' });
  }

  // 2. Récupérer toutes les notes pour cet utilisateur
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('*')
    .eq('uuid', uuid)
    .order('created_at', { ascending: false });

  if (notesError) {
    return res.status(500).json({ error: 'Error fetching notes.' });
  }

  res.json({ events, notes });
});

// POST /event - créer un événement
app.post('/event', async (req, res) => {
  const {
    title,
    uuid,
    timeStart,
    timeEnd,
    date,
    invited,
    online_event,
    reminder,
    repeat,
    color
  } = req.body;



  const { data, error } = await supabase
    .from('event')
    .insert([
      {
        title,
        uuid,
        timeStart,
        timeEnd,
        date,
        color,
        invited,
        online_event,
        reminder,
        repeat,
        color
      }
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to insert event.', details: error });
  }

  res.status(201).json({ message: 'Event created successfully.', event: data });
});


app.post('/note', async (req, res) => {
    const {
      title,
      content,
      uuid
    } = req.body;
  
    // Insert the note into the 'notes' table
    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          title,
          content,
          uuid
        }
      ])
      .select()
      .single();
  
    if (error) {
      return res.status(500).json({ error: 'Failed to insert note.', details: error });
    }
  
    res.status(201).json({ message: 'Note created successfully.', note: data });
});
  
app.put('/note', async (req, res) => {
    const {
        id,
        title,
        content
    } = req.body;
  
    // Insert the note into the 'notes' table
    const { data, error } = await supabase
      .from('notes')
      .update([
        {
          title,
          content
        }
      ])
      .eq("id", id)
      .select()
      .single();

  
    if (error) {
      return res.status(500).json({ error: 'Failed to insert note.', details: error });
    }
  
    res.status(201).json({ message: 'Note created successfully.', note: data });
});


app.delete('/note', async (req, res) => {
  const { id } = req.body;

  const { data, error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to delete note.', details: error });
  }

  res.status(200).json({ message: 'Note deleted successfully.', note: data });
});


app.delete('/event', async (req, res) => {
  const { id } = req.body;

  const { error } = await supabase
    .from('event')
    .delete()
    .eq('id', id)
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to delete note.', details: error });
  }

  res.status(200).json({ message: 'Note deleted successfully.' });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});


app.post('/delete_user', async (req, res) => {
  const {
    uuid
  } = req.body;

  // Insert the note into the 'notes' table
  const { data, error } = await supabase.auth.admin.deleteUser(
    uuid
  )

  const response = await supabase
  .from('users')
  .delete()
  .eq('id', uuid)

  if (error) {
    return res.status(500).json({ error: 'Failed to delete user.', details: error });
  }

  res.status(201).json({ message: 'Deleted sucessfuly.', note: data });
});





// Get PayPal access token
async function getPayPalAccessToken() {
  const response = await axios({
    method: 'post',
    url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    auth: {
      username: process.env.PAYPAL_CLIENT_ID,
      password: process.env.PAYPAL_CLIENT_SECRET,
    },
    data: 'grant_type=client_credentials',
  });

  return response.data.access_token;
}

app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const accessToken = await getPayPalAccessToken();

    const order = await axios.post(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '7',
            },
          },
        ],
        application_context: {
          return_url: 'https://apianas-supabaseurl.up.railway.app/paypal-success',
          cancel_url: 'https://apianas-supabaseurl.up.railway.app/paypal-cancel',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(order.data);
  } catch (error) {
    console.error('Erreur PayPal:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur lors de la création de la commande PayPal' });
  }
});

// Endpoint pour capturer la commande et créer l’abonnement
app.post('/api/paypal/capture-order', async (req, res) => {
  const { orderID, userId } = req.body;

  try {
    const accessToken = await getPayPalAccessToken();

    const capture = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const paymentInfo = capture.data;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    // Insert payment record into the database
    const { data, error } = await supabase
      .from('users')
      .update({ subs: true })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Payment captured but failed to insert into database.', details: error });
    }

    res.json({ success: true, paymentInfo, db: data });
  } catch (error) {
    console.error('Erreur Capture:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur lors de la capture de paiement' });
  }
});

app.get('/paypal-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Success</title>
        <style>
          body {
            background: #f6fffa;
            color: #222;
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
            padding: 40px 32px;
            text-align: center;
            max-width: 400px;
          }
          .icon-success {
            font-size: 64px;
            color: #27ae60;
            margin-bottom: 16px;
          }
          h1 {
            margin: 0 0 12px 0;
            font-size: 2rem;
          }
          p {
            margin: 0 0 24px 0;
            color: #555;
          }
          .btn {
            display: inline-block;
            padding: 10px 24px;
            background: #27ae60;
            color: #fff;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #219150;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-success">✔️</div>
          <h1>Payment Successful!</h1>
          <p>Your payment was processed successfully.<br>Thank you for your purchase!</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/paypal-cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Failed</title>
        <style>
          body {
            background: #fff6f6;
            color: #222;
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
            padding: 40px 32px;
            text-align: center;
            max-width: 400px;
          }
          .icon-failed {
            font-size: 64px;
            color: #e74c3c;
            margin-bottom: 16px;
          }
          h1 {
            margin: 0 0 12px 0;
            font-size: 2rem;
          }
          p {
            margin: 0 0 24px 0;
            color: #555;
          }
          .btn {
            display: inline-block;
            padding: 10px 24px;
            background: #e74c3c;
            color: #fff;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #c0392b;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-failed">❌</div>
          <h1>Payment Failed</h1>
          <p>There was an error processing your payment.<br>Please try again or contact support.</p>
        </div>
      </body>
    </html>
  `);
});