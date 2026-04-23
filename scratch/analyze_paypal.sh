#!/bin/bash

# PayPal Credentials
CLIENT_ID="AQCCWaOGvX92tZI1uf4511x3WG1Hp2obxM4mTNgGX-pnUfObT2bnxfVMRHzSr2zTCycyx6jQtLLRdRx8"
SECRET="EHG_TGzQxZ6KyaogI1MjWYc_PhzlCFwa2-qrm3rBzOSAZFdgNcAtmrFVT6TeCQTlf-i2CYTmc2H2PjmK"

# Webhook IDs to check (sampling the first 10 and last 10)
IDS=(
"WH-650239855G7834153-0TX52612A1603991V"
"WH-5CU61984R46098259-43448044VC5316429"
"WH-9K246594TJ4236607-47730171R1998012B"
"WH-6TT43516M02870811-9U406739XK879231A"
"WH-4NM045699F523953P-50317917NK172072B"
"WH-8L054545TV949770A-6HH57857B95167230"
"WH-40L34217UU127714S-6HV92320Y01205056"
"WH-65826711UT6906530-55796351J8433345A"
"WH-47V249047U467025B-31300434EE7158535"
"WH-0VS986141L035791D-6WM300619S1363627"
)

echo "🔑 Fetching PayPal Token..."
TOKEN=$(curl -s -u "$CLIENT_ID:$SECRET" -d "grant_type=client_credentials" https://api-m.paypal.com/v1/oauth2/token | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token."
    exit 1
fi

echo "✅ Token obtained."
echo "------------------------------------------------"
printf "%-40s | %-15s | %-25s | %-15s\n" "Webhook ID" "Plan" "Email" "Custom ID"
echo "------------------------------------------------"

for ID in "${IDS[@]}"; do
    # Fetch event details
    DATA=$(curl -s -H "Authorization: Bearer $TOKEN" "https://api-m.paypal.com/v1/notifications/webhooks-events/$ID")
    
    # Extract fields using grep/sed (since jq might not be available)
    PLAN_ID=$(echo "$DATA" | grep -o '"plan_id":"[^"]*' | cut -d'"' -f4 | head -n 1)
    EMAIL=$(echo "$DATA" | grep -o '"email_address":"[^"]*' | cut -d'"' -f4 | head -n 1)
    CUSTOM_ID=$(echo "$DATA" | grep -o '"custom_id":"[^"]*' | cut -d'"' -f4 | head -n 1)
    
    if [ -z "$PLAN_ID" ]; then PLAN_ID="N/A"; fi
    if [ -z "$EMAIL" ]; then EMAIL="N/A"; fi
    if [ -z "$CUSTOM_ID" ]; then CUSTOM_ID="N/A"; fi

    # Translate Plan ID to human readable
    PLAN_NAME=$PLAN_ID
    if [ "$PLAN_ID" == "P-0E135132J93420229NG3WTWA" ]; then PLAN_NAME="$2.99 (Mo)"; fi
    if [ "$PLAN_ID" == "P-0PU3781769776022HNG3WTWI" ]; then PLAN_NAME="$19.99 (Yr)"; fi

    printf "%-40s | %-15s | %-25s | %-15s\n" "$ID" "$PLAN_NAME" "$EMAIL" "$CUSTOM_ID"
done
