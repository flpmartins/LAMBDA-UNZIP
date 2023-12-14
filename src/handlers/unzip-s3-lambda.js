const unzipper = require('unzipper')
const AWS = require('aws-sdk')
const fs = require('fs')

const { S3 } = AWS
const s3 = new S3()

exports.unzipS3LambdaHandler = async (event, context) => {
  try {
    const bucketName = event.Records[0].s3.bucket.name
    const key = event.Records[0].s3.object.key
    const tempDir = '/tmp'
    fs.mkdirSync(tempDir, { recursive: true })

    const downloadPath = `${tempDir}/${key}`
    await s3.getObject({ Bucket: bucketName, Key: key }).promise()
    const data = await s3.getObject({ Bucket: bucketName, Key: key }).promise()
    fs.writeFileSync(downloadPath, data.Body)

    const extractPath = `${tempDir}/extracted`

    await fs.createReadStream(downloadPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise()

    const files = fs.readdirSync(extractPath)
    for (const file of files) {
      const uploadKey = `destination-folder/${file}`
      await s3.upload({ Bucket: bucketName, Key: uploadKey, Body: fs.createReadStream(`${extractPath}/${file}`) }).promise()
    }

    return {
      statusCode: 200,
      body: 'Arquivo ZIP descompactado com sucesso!',
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: `Erro: ${error.message}`,
    }
  }
}
