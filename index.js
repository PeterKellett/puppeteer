const puppeteer = require('puppeteer')
const fs = require('fs/promises');
const {
    kMaxLength
} = require('buffer');
var n = 1

const scrollToPageEnd = async (page) => {
    let originalOffset = 0;
    while (true) {
        await page.evaluate('window.scrollBy(0, document.body.scrollHeight)');
        await page.waitForTimeout(2000);
        let newOffset = await page.evaluate('window.pageYOffset');
        if (originalOffset === newOffset) {
            break;
        }
        originalOffset = newOffset;
    }
}

async function start() {
    const browser = await puppeteer.launch({
        ignoreDefaultArgs: ['--disable-extensions'],
    });
    const page = await browser.newPage()
    await page.goto("https://order.syscoireland.com/")
    const categories = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".pagebuilder-column a")).map(function (x) {
            return x.href
        })
    })
    const categories_done = [];
    for (const category of categories) {
        if (!categories_done.includes(category)) {
            console.log("NO")
            console.log("categories_done = ", categories_done)
            console.log("category: ", category)
            categories_done.push(category)
            await page.goto(category)
            const subcats = await page.evaluate(() => {
                // ".subcategory-list.all > a"
                return Array.from(document.querySelectorAll(".subcategory-list.all > a")).map(x => x.href)
            })

            console.log("Subcats: ", subcats)
            for (const subcatitem of subcats) {
                console.log("SubcatItem: ", subcatitem)
                await page.goto(subcatitem)
                await scrollToPageEnd(page);
                const products = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll(".product-item-link")).map(x => x.href)
                })
                for (const product of products) {
                    await page.goto(product)
                    var product_name = await page.evaluate(() => {
                        const element = document.querySelector("span.base")
                        if (element) {
                            return element.textContent
                        } else {
                            return null
                        }
                    })
                    var allergens = await page.evaluate(() => {
                        const element = document.querySelector(".product-attribute-allergy")
                        if (element) {
                            return element.textContent.slice(9)
                        } else {
                            return null
                        }
                    })
                    const allergen_index = []
                    const allergen_list = {
                        "Cereals": 1,
                        "Gluten/Wheat": 1,
                        "Crustaceans": 2,
                        "Eggs": 3,
                        "Fish": 4,
                        "Peanuts": 5,
                        "Soybeans": 6,
                        "Milk": 7,
                        "Nuts": 8,
                        "Celery": 9,
                        "Mustard": 10,
                        "SesameSeeds": 11,
                        "SulphurDioxide/Sulphites": 12,
                        "Lupin": 13,
                        "Molluscs": 14
                    }
                    if (allergens != null) {
                        var product_allergens = allergens.split(",")
                        for (const allergen of product_allergens) {
                            for (const [key, value] of Object.entries(allergen_list)) {
                                if (allergen.replace(/\s/g, '') == key) {
                                    allergen_index.push(value)
                                }
                            }
                        }
                        // console.log("product = ", product)
                        // console.log("product_allergens = ", product_allergens)
                        // console.log("allergens = ", allergens)
                    }

                    const nutrition = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll(".product-attribute-nutrition tbody")).map(function(x) {
                            return {
                                ['product_name']: null,
                                [x.children[0].firstChild.textContent]: Number(x.children[0].lastChild.textContent),
                                [x.children[1].firstChild.textContent]: Number(x.children[1].lastChild.textContent),
                                [x.children[2].firstChild.textContent.split(' ')[1]]: Number(x.children[2].lastChild.textContent),
                                [x.children[3].firstChild.textContent.split(' ')[1]]: Number(x.children[3].lastChild.textContent),
                                [x.children[4].firstChild.textContent.split(' ')[1]]: Number(x.children[4].lastChild.textContent),
                                [x.children[5].firstChild.textContent.split(' ')[1]]: Number(x.children[5].lastChild.textContent),
                                [x.children[6].firstChild.textContent.split(' ')[1]]: Number(x.children[6].lastChild.textContent),
                                [x.children[7].firstChild.textContent.split(' ')[1]]: Number(x.children[7].lastChild.textContent),
                            }
                        })
                    })
                    if (nutrition[0] != undefined) {
                        nutrition[0].product_name = product_name;
                        nutrition[0]['Allergens'] = allergen_index;
                        // console.log("Nutrition: ", nutrition[0]);
                        fs.appendFile('fixtures.txt', `{"pk":${n}, "model": "home.products", "fields": ${JSON.stringify(nutrition[0])}},`);
                        n++;
                    }
                }
            }
        } else {
            console.log("YES")
            // console.log("categories = ", categories)
            // console.log("category: ", category)
            continue 
        }

    }

    await browser.close()
}

start()