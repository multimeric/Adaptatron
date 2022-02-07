import "reflect-metadata"
import {Model, PartitionKey} from '@shiftcoders/dynamo-easy'
import * as AWS from 'aws-sdk/global'

AWS.config.update({ region: 'us-east-1' })

@Model({ tableName: process.env.AWS_TABLE_NAME })
export class Card {
    @PartitionKey()
    cardCode: string

    name: string
    description: string
    assets: any[]
}

