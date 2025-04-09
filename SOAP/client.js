// const soap = require("soap");

// soap.createClient(
//   "http://localhost:8000/products?wsdl",
//   {},
//   function (err, client) {
//     if (err) {
//       console.error("Error creating SOAP client:", err);
//       return;
//     }
//     // Make a SOAP request
//     //   client.CreateProduct({ name: "My product" }, function (err, result) {
//     //     if (err) {
//     //       console.error(
//     //         "Error making SOAP request:",
//     //         err.response.status,
//     //         err.response.statusText,
//     //         err.body
//     //       );
//     //       return;
//     //     }
//     //     console.log("Result:", result);
//     //   });

//     client.CreateProduct(
//       { name: "My product", about: "A great product", price: 99.99 },
//       function (err, result) {
//         if (err) {
//           console.error(
//             "Error making SOAP request:",
//             err.response.status,
//             err.response.statusText,
//             err.body
//           );
//           return;
//         }
//         console.log("Result:", result);
//       }
//     );
//   }
// );

const soap = require("soap");

soap.createClient(
  "http://localhost:8000/products?wsdl",
  {},
  function (err, client) {
    if (err) {
      console.error("Error creating SOAP client:", err);
      return;
    }

    // Make a SOAP request
    client.CreateProduct(
      {
        request: { name: "My product", about: "A great product", price: 99.99 },
      },
      function (err, result) {
        if (err) {
          console.error("Error making SOAP request:", err);
          return;
        }
        console.log("Result:", result);
      }
    );
  }
);
