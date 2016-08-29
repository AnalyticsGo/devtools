#!/usr/bin/env bash

# Inspired from the following blog post and gists
# https://robinpowered.com/blog/best-practice-system-for-organizing-and-tagging-github-issues/
# https://gist.github.com/omegahm/28d87a4e1411c030aa89
# https://gist.github.com/Chompas/fb158eb01204d03f783d

declare -A LABELS

# Workflow

readonly WORKFLOW="996633"
LABELS["TODO"]=${WORKFLOW}
LABELS["WIP"]=${WORKFLOW}
LABELS["QA"]=${WORKFLOW}

# Type

readonly TYPE="0099ff"
LABELS["bug"]=${TYPE}
LABELS["enhancement"]=${TYPE}
LABELS["feature"]=${TYPE}

# Severity

LABELS["minor"]="009900"
LABELS["major"]="ff9900"
LABELS["critical"]="ff0000"

# Inactive

readonly INACTIVE="cccccc"
LABELS["invalid"]=${INACTIVE}
LABELS["duplicate"]=${INACTIVE}
LABELS["wontfix"]=${INACTIVE}

# Feedback

readonly FEEDBACK="ff66cc"
LABELS["question"]=${FEEDBACK}
LABELS["discussion"]=${FEEDBACK}

TOKEN=$(cat .github.token)
OWNER=AnalyticsGo

echo "Owner: $OWNER"
read -p "Repo: " repo

echo "Configuring teams..."

CURL_OUTPUT=$(curl -s -H "Authorization: token $TOKEN" -X GET "https://api.github.com/orgs/$OWNER/teams")
ADMIN_TEAM=$(echo $CURL_OUTPUT | jq -c '.[] | select(.name == "Admin")')

CURL_OUTPUT=$(curl -s -H "Authorization: token $TOKEN" -X PUT "https://api.github.com/teams/$(echo $ADMIN_TEAM | jq '.id')/repos/$OWNER/$repo" -d "{\"permission\":\"admin\"}")
echo "Updated team [$(echo $ADMIN_TEAM | jq '.name')]"

echo "Configuring labels..."

CURL_OUTPUT=$(curl -s -H "Authorization: token $TOKEN" -X GET "https://api.github.com/repos/$OWNER/$repo/labels")
declare -a "ALL_LABELS=($(echo $CURL_OUTPUT | jq '.[].name'))"
declare -A UPDATED_LABELS

for L in "${ALL_LABELS[@]}"; do
  if [ "${LABELS[$L]}" == "" ]; then
    CURL_OUTPUT=$(curl -s -H "Authorization: token $TOKEN" -X DELETE "https://api.github.com/repos/$OWNER/$repo/labels/$(echo $L | jq -R -r @uri)")
    echo "Deleted label [$L]"
  else
    CURL_OUTPUT=$(curl -s -H "Authorization: token $TOKEN" -X PATCH "https://api.github.com/repos/$OWNER/$repo/labels/$(echo $L | jq -R -r @uri)" -d "{\"name\":\"$L\",\"color\":\"${LABELS[$L]}\"}")
    UPDATED_LABELS[$L]=TRUE
    echo "Updated label [$L]"
  fi
done

for L in "${!LABELS[@]}"; do
  if [ "${UPDATED_LABELS[$L]}" != "TRUE" ]; then
    CURL_OUTPUT=$(curl -s -H "Authorization: token $TOKEN" -X POST "https://api.github.com/repos/$OWNER/$repo/labels" -d "{\"name\":\"$L\",\"color\":\"${LABELS[$L]}\"}")
    echo "Created label [$L]"
  fi
done

exit 0
