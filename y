{
  "indexes": [
    {
      "collectionGroup": "entregas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "clienteId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "dataEntrega",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "entregas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "clientId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "dataEntrega",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "pedidos",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "clientId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "dataEntrega",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}