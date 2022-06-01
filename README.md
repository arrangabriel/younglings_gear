## Younglings gear backend

# Running

Setup [Atlas](https://account.mongodb.com/account)

Edit **config.env.template**
- Add Atlas uri, with credentials
- Rename database if needed
- Remove .template extension

Have node installed

```npm install``` 

```node server.js```

Server should now be running on localhost:5000

# API

The API provides two main endpoints **/device** and **/person**.

These are used to interact with their respective data models.

## Device

A device consists of a unique serial number, and a device name.

### List devices
```
Endpoint: /device
Operation: GET
Body: n/a
Result: Returns a list of all registered devices.

[
    {
        device_name: String,
        device_sn: String, 
        loaned: Boolean
    }
]
```
### Add device
```
Enpoint: /device
Operation: POST
Body:

{
    "device_name": String,
    "device_sn": String
}

Result: Creates a new device.
```
### Get device
```
Endpoint: /device/sn
Operation: GET
Body: n/a
Result: Returns the device with device_sn = sn, or null if no such device exists.

{
    device_name: String,
    device_sn: sn,
    loaned: Boolean
}
```
### Delete device
```
Endpoint /device/sn
Operation: DELETE
Body: n/a
Result: Deletes the device with device_sn = sn. If a person is registered as loaning the device it is removed.
```
### Edit device
```
Endpoint: /device/sn
Operation: PATCH
Body: 

{
    "device_name": String, (optional)
    "device_sn": String (optional)
}

Result: Edits the device with device_sn = sn, if the new values are valid.
```
## Person
A person consists of a first name, last name and a list of devices they are loaning. A first/last name combo must be unique.
### List people
```
Endpoint: /person
Operation: GET
Body: n/a
Result: The list of all registered people.

[
    {
        firstname: String,
        lastname: String,
        devices: [
            {
                device_sn: String,
                device_name: String,
                recieved_date: Date
            }
        ]
    }
]
```
### Add person
```
Endpoint: /person
Operation: POST
Body: 

{
    "firstname": String,
    "lastname": String
}

Result: Creates a new person if the name-combination was unique.
```
### Get person
```
Endpoint: /person/firstname/lastname
Operation: GET
Body: n/a
Result: The person with firstname = firstname and lastname = lastname, or null if no such person exists

{
    firstname: firstname,
    lastname: lastname,
    devices: [
        {
            device_sn: String,
            device_name: String,
            recieved_date: Date
        }
    ]
}
```
### Delete person
```
Endpoint: /person/firstname/lastname
Operation: DELETE
Body: n/a
Result: Deletes the person with firstname = firstname and lastname = lastname. If the person had devices assigned to them their loaned field is set to false.
```
### Edit person
```
Endpoint: /person/firstname/lastname
Operation: PATCH
Body: 

{
    "firstname": String, (optional)
    "lastname": String (optional)
}

Result: Edits the person with firstname = firstname and lastname = lastname if the new values are valid.
```
### Assign device to person
```
Endpoint: /person/firstname/lastname/add_device/sn
Operation: POST
Body: n/a
Result: Assigns the device with device_sn = sn to the person with firstname = firstname and lastname = lastname, if such a device and person exist and the device is not currently loaned out. The recieved_date field is set to the current time. The devices loaned field is set to true.
```
### Remove device from person
```
Endpoint: /person/firstname/lastname/remove_device/sn
Operation: POST
Body: n/a
Result: Removes the device with device_sn = sn from the person with firstname = firstname and lastname = lastname, if such a device was assigned to the person. The devices loaned field is set to false.
```