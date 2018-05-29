import * as Hub from "../../hub"
import * as fs from "fs"
import * as moment from "moment"

export class MailMerge extends Hub.Action {

  name = "mail_merge"
  label = "Integra Mail Merge"
  iconName = "mail_merge/mail_merge.jpg"
  description = "Send individual emails to each recipient listed in the report"
  params = [
    {
      description: "This is just an example",
      label: "Global Param",
      name: "globalParam",
      required: false,
      sensitive: false,
    }
  ]
  supportedActionTypes = [Hub.ActionType.Query]
  supportedFormats = [Hub.ActionFormat.Json]
  supportedFormattings = [Hub.ActionFormatting.Formatted]
  supportedVisualizationFormattings = [Hub.ActionVisualizationFormatting.Noapply]
  requiredFields = []

  async execute(request: Hub.ActionRequest) {
    if (!(request.attachment && request.attachment.dataJSON)) {
      throw "Couldn't get data from attachment."
    }
    if (!(request.formParams && request.formParams.letterType)) {
      throw "Couldn't get required params."
    }

    console.log(request.attachment.dataJSON)

    // TODO: look inside request.scheduledPlan.query.fields to verify the necessary fields are present

    const queryResults = request.attachment.dataJSON

    let subject: string
    switch (request.formParams.letterType) {
      case "discountCompliance":
        subject = "Your Sales Trends"
        break
      case "pastDue":
        subject = "Notice: Past Due Invoice"
        break
      case "upcomingRenewal":
        subject = "Your Upcoming Contract Renewal"
        break
    }

    const cleanedResults = queryResults.map((dataRow: any) => {
      return {
        email:       dataRow["users.email"],
        firstName:   dataRow["users.first_name"],
        lastName:    dataRow["users.last_name"],
        state:       dataRow["users.state"],
        zip:         dataRow["users.zip"],
        orderCount:  dataRow["orders.count"],
        totalSpent:  dataRow["order_items.total_sale_price"]
      }
    })

    const recordHtml = cleanedResults.map((record: any) => {
      return `<table>
          <tr><th>Subject</th><td>${subject}</td></tr>
          <tr><th>Email</th><td>${record.email}</td></tr>
          <tr><th>Name</th><td>${record.firstName} ${record.lastName}</td></tr>
          <tr><th>Address</th><td>${record.state}, ${record.zip}</td></tr>
          <tr><th>Order Count</th><td>${record.orderCount}</td></tr>
          <tr><th>Total Spent</th><td>${record.totalSpent}</td></tr>
        </table>`
    })

    const fileContents = `
      <body>
      <head><link rel="stylesheet" type="text/css" href="mail_merge.css"></head>
      <div id="header"><h1>Mail Merge - Demo Output</h1>
      <h2>Ran at: ${moment().format('MMMM Do YYYY, h:mm:ss a')}</h2></div>
      <html>${recordHtml.join("\n")}</html>
      </body>`;

    try {
      fs.writeFileSync('./public/mail_merge_results.html', fileContents)
      console.log("MAIL MERGE - File created")
    } catch (err) {
      console.error(err)
    }

    const response = { success: true, message: "no op!" }
    return new Hub.ActionResponse(response)
  }

  async form() {
    const form = new Hub.ActionForm()

    form.fields = [{
      name: "letterType",
      label: "Letter Type",
      description: "Which email template to use",
      required: true,
      type: "select",
      default: "discountCompliance",
      options: [{
        name: "discountCompliance", 
        label: "Not trending towards discount compliance"
      },{
        name: "pastDue", 
        label: "Past due invoices"
      },{
        name: "upcomingRenewal", 
        label: "Upcoming renewal"
      },{
        name: "custom",
        label: "Custom Template - insert below"
      }]
    },{
      name: "customTemplate",
      label: "Custom Template",
      description: "This will be used if you select 'Custom' as the Letter Type",
      type: "textarea",
      required: false
    }]

    return form
  }
 

}

Hub.addAction(new MailMerge())