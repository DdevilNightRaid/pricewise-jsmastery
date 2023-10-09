import { getEmailNotifType } from './../../../lib/utils';
import Product from '@/lib/models/product.model';
import { scrapeAmazonProduct } from '@/lib/scraper';
import { getAveragePrice, getHighestPrice, getLowestPrice } from '@/lib/utils';
import { connectToDB } from './../../../lib/mongoose';
import { generateEmailBody, sendEmail } from '@/lib/nodemailer';
import { NextResponse } from 'next/server';
export async function GET() {
    try {
        connectToDB();
        const products = await Product.find({});

        if (!products) throw new Error('No products found')

        // 1 scrape latest product details & update db
        const updatedProducts = await Promise.all(
            products.map(async (currentProduct) => {
                const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

                if (!scrapedProduct) throw new Error("No product found");

                const updatedPriceHistory = [
                    ...currentProduct.priceHistory,
                    { price: scrapedProduct.currentPrice }
                ];

                const product = {
                    ...scrapedProduct,
                    priceHistory: updatedPriceHistory,
                    lowestPrice: getLowestPrice(updatedPriceHistory),
                    highestPrice: getHighestPrice(updatedPriceHistory),
                    averagePrice: getAveragePrice(updatedPriceHistory),
                }

                const updatedProduct = await Product.findOneAndUpdate(
                    { url: scrapedProduct.url },
                    product,
                );

                // 2. Check each product's status & send email accordingly
                const emailNotifType = getEmailNotifType(scrapedProduct, currentProduct)
                
                if(emailNotifType && updatedProduct.users.length > 0){
                    const productInfo = {
                        title: updatedProduct.title,
                        url: updatedProduct.url,
                    }

                    const emailContent = await generateEmailBody(productInfo, emailNotifType);

                    const userEmails = updatedProduct.users.map((user: any) => user)

                    await sendEmail(emailContent, userEmails);
                }

                return updatedProduct;
            })
        )
        return NextResponse.json({
            message: 'Ok', data: updatedProducts
        })
    } catch (error) {
        throw new Error(`Error in GET: ${error}`)
    }
}