
struct InitResult {
    1:string token
}

service Logger {
    InitResult init(
        1:string kafkaHost,
        2:i32 kafkaPort,
        3:string team,
        4:string project
    )
    void log(
        1:string level,
        2:string message,
        3:string token
    )
}
