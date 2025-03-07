const request = require("supertest");
const app = require("./app"); 
const mongoose = require("mongoose");
const User = require("./models/users");

describe("POST /articles", () => {
  let userToken;

  beforeAll(async () => {
    
    const user = new User({
      firstname: "Test",
      lastname: "User",
      email: "test@example.com",
      password: "password123",
      token: "test-token",
    });

    await user.save();
    userToken = user.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("Should create a new article successfully", async () => {
    const newArticle = {
      token: userToken,
      title: "Article Test",
      productDescription: "Ceci est une description test",
      category: "Électronique",
      itemType: "Téléphone",
      condition: "Neuf",
      price: 100,
    };

    const response = await request(app)
      .post("/articles")
      .send(newArticle)
      .expect(200); 

    
    console.log("Response body:", response.body); 

    
    expect(response.body.result).toBe(true);
    expect(response.body.article).toHaveProperty('title', 'Article Test');
    expect(response.body.article).toHaveProperty('productDescription', 'Ceci est une description test');
    expect(response.body.article).toHaveProperty('price', 100);
  });
});