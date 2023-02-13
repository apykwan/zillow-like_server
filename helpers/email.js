const { EMAIL_FROM, JWT_SECRET } = require('../config');

const style = `
    background-color: #eee;
    padding: 20px;
    border-radius: 20px;
`;

const emailTemplate = (email, content, replyTo, subject) => {
    return {
        Source: EMAIL_FROM,
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: `
                        <html>
                            <div style="${style}">
                                <h1>Welcome to Zillow Like App</h1>
                                ${content}
                                <p>&copy; ${new Date().getFullYear()}</p>
                            </div>
                        </html>
                    `
                }
            },
            Subject: {
                Charset: "UTF-8",
                Data: subject 
            }
        }
    }
}

module.exports = {
    emailTemplate
};