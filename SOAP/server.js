// const soap = require("soap");
// const fs = require("node:fs");
// const http = require("http");
// const postgres = require("postgres");

// const sql = postgres({
//   db: "mydb",
//   user: "user",
//   password: "password",
//   port: 5433,
// });

// // Define the service implementation
// const service = {
//   ProductsService: {
//     CreateProduct: async function ({ name, about, price }, callback) {
//         console.log(name, about, price);
//       if (!name || !about || !price) {
//         console.log("test");
//         throw {
//           Fault: {
//             Code: {
//               Value: "soap:Sender",
//               Subcode: { value: "rpc:BadArguments" },
//             },
//             Reason: { Text: "Processing Error" },
//             statusCode: 400,
//           },
//         };
//       }

//       const product = await sql`
//           INSERT INTO products (name, about, price)
//           VALUES (${name}, ${about}, ${price})
//           RETURNING *
//           `;
//       console.log(product);

//       // Will return only one element.
//       callback(product[0]);
//     },
//   },
// };

// // http server example
// const server = http.createServer(function (request, response) {
//   response.end("404: Not Found: " + request.url);
// });

// server.listen(8000);

// // Create the SOAP server
// const xml = fs.readFileSync("productsService.wsdl", "utf8");
// soap.listen(server, "/products", service, xml, function () {
//   console.log("SOAP server running at http://localhost:8000/products?wsdl");
// });



const soap = require("soap");
const fs = require("node:fs");
const http = require("http");
const postgres = require("postgres");

const sql = postgres({
  db: "mydb",
  user: "user",
  password: "password",
  port: 5433,
});

// Define the service implementation
const service = {
  ProductsService: {
    ProductsPort: {
      CreateProduct: async function ({ request }) {
        const { name, about, price } = request;
        console.log(name, about, price);

        if (!name || !about || !price) {
          console.log("test");
          throw {
            Fault: {
              Code: {
                Value: "soap:Sender",
                Subcode: { value: "rpc:BadArguments" },
              },
              Reason: { Text: "Processing Error" },
              statusCode: 400,
            },
          };
        }

        const product = await sql`
          INSERT INTO products (name, about, price)
          VALUES (${name}, ${about}, ${price})
          RETURNING *
        `;

        console.log(product);
        return product[0];
      },
    },
  },
};

// HTTP server example
const server = http.createServer(function (request, response) {
  response.end("404: Not Found: " + request.url);
});

server.listen(8000);

// Create the SOAP server
const xml = fs.readFileSync("productsService.wsdl", "utf8");
soap.listen(server, "/products", service, xml, function () {
  console.log("SOAP server running at http://localhost:8000/products?wsdl");
});
