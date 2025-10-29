// import { defineConfig } from "cypress";
// import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
// import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
// import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild";

// export default defineConfig({
//   e2e: {
//     async setupNodeEvents(
//       on: Cypress.PluginEvents,
//       config: Cypress.PluginConfigOptions
//     ) {
//       // ✅ เพิ่ม plugin สำหรับ Cucumber
//       await addCucumberPreprocessorPlugin(on, config);

//       // ✅ ตั้งค่า preprocessor ให้รองรับทั้ง feature และ Cypress ปกติ
//       on(
//         "file:preprocessor",
//         createBundler({
//           plugins: [createEsbuildPlugin(config)],
//         })
//       );

//       return config;
//     },

//     // ✅ รองรับไฟล์เทสต์ทั้งสองแบบ
//     specPattern: [
//       "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
//       "cypress/e2e/**/*.spec.{js,jsx,ts,tsx}",
//       "cypress/e2e/**/*.feature",
//     ],

//     baseUrl: "http://localhost:3000",
//   },
// });


import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",

    // 🔍 บอกว่าไฟล์เทสต์อยู่ตรงไหน
    specPattern: [
      "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
      "cypress/e2e/**/*.spec.{js,jsx,ts,tsx}",
    ],

    // ⚙️ ตั้งค่า event ต่าง ๆ ถ้ามี
    setupNodeEvents(on, config) {
      // ตัวอย่าง event (optional)
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.name === "chrome") {
          launchOptions.args.push("--start-fullscreen");
        }
        return launchOptions;
      });

      return config;
    },
  },
});
