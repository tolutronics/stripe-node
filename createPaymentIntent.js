require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(req, res) {
  const { amount, currency, customer_email, customer_name } = req.body;

  let customer = null;

  // check if customer exists
  let existing_customer = await stripe.customers.list({
    email: customer_email,
  });

  console.log({ existing_customer });

  if (existing_customer.data && existing_customer.data.length > 0) {
    customer = existing_customer.data[0];
  } else {
    // create customer
    await stripe.customers
      .create({
        email: customer_email,
        name: customer_name,
      })
      .then((data) => {
        customer = data;
      })
      .catch((error) => {
        console.error(error);
        res
          .status(500)
          .send({ error: "An error occurred while creating customer" });
      });
  }

  //  create ephemeralKey for customer

  let ephemeralKey = null;

  await stripe.ephemeralKeys
    .create({ customer: customer.id }, { apiVersion: "2023-10-16" })
    .then((key) => {
      ephemeralKey = key;
      // res.json({ key });
    })
    .catch((error) => {
      console.error(error);
      res
        .status(500)
        .send({ error: "An error occurred while creating ephemeral key" });
    });

  // Create a PaymentIntent with the order amount and currency
  await stripe.paymentIntents
    .create({
      amount,
      currency,
      // You can also add additional parameters here, such as a customer ID or payment method ID
      metadata: { integration_check: "accept_a_payment" },
    })
    .then((paymentIntent) => {
      res.json({
        paymentIntentClientSecret: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
        },
      });
    })
    .catch((error) => {
      console.error(error);
      res
        .status(500)
        .send({ error: "An error occurred while creating the payment intent" });
    });
}

module.exports = {
  createPaymentIntent,
};
