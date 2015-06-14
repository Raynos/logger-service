
struct InitResult {
    1:string token
}

struct HealthResult {
    1:string message
}

service Logger {
    InitResult init(
        1:required string kafkaHost,
        2:required i32 kafkaPort,
        3:required string team,
        4:required string project
    )
    void log(
        1:required string level,
        2:required string message
    )

    HealthResult health()
}
